import mongoose from 'mongoose';
import { Progress, IProgress } from '../models/Progress';
import { Roadmap } from '../models/Roadmap';
import { LearnerProfile } from '../models/LearnerProfile';
import { ApiError } from '../utils/ApiError';
import { emitProgressEvent, PROGRESS_EVENTS } from '../socket';

export interface ProgressUpdateInput {
  status?: 'not_started' | 'in_progress' | 'completed';
  completionPercentage?: number;
  timeSpent?: number;
  notes?: string;
}

export interface PhaseProgressSummary {
  phaseId: string;
  title: string;
  totalMilestones: number;
  completedMilestones: number;
  completionPercentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

export class ProgressService {
  async getProgressByUserId(userId: string, roadmapId?: string): Promise<IProgress[]> {
    const filter: any = { userId };
    if (roadmapId && mongoose.Types.ObjectId.isValid(roadmapId)) {
      filter.roadmapId = roadmapId;
    }
    return Progress.find(filter).sort({ updatedAt: -1 });
  }

  async updateProgress(
    userId: string,
    progressIdOrMilestoneId: string,
    data: ProgressUpdateInput
  ): Promise<{ progress: IProgress; summary: any; phaseProgress: PhaseProgressSummary[] }> {
    const queryConditions: any[] = [{ milestoneId: progressIdOrMilestoneId }];
    if (mongoose.Types.ObjectId.isValid(progressIdOrMilestoneId)) {
      queryConditions.push({ _id: progressIdOrMilestoneId });
    }

    let progress = await Progress.findOne({
      userId,
      $or: queryConditions,
    });

    if (!progress) {
      throw ApiError.notFound('Progress record for this milestone was not found.');
    }

    // Security ownership verification
    if (progress.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have permission to update this progress record.');
    }

    const previousStatus = progress.status;

    // Handle status & completion percentage deterministically
    if (data.status === 'completed' || data.completionPercentage === 100) {
      progress.status = 'completed';
      progress.completionPercentage = 100;
      if (!progress.completedAt) {
        progress.completedAt = new Date();
      }
    } else if (
      data.status === 'in_progress' ||
      (data.completionPercentage !== undefined && data.completionPercentage > 0 && data.completionPercentage < 100)
    ) {
      progress.status = 'in_progress';
      progress.completionPercentage = data.completionPercentage ?? (progress.completionPercentage || 50);
      if (!progress.startedAt) {
        progress.startedAt = new Date();
      }
      progress.completedAt = undefined;
    } else if (data.status === 'not_started' || data.completionPercentage === 0) {
      progress.status = 'not_started';
      progress.completionPercentage = 0;
      progress.completedAt = undefined;
    }

    // Accumulate learning hours safely
    if (data.timeSpent !== undefined && data.timeSpent > 0) {
      progress.timeSpent = (progress.timeSpent || 0) + data.timeSpent;
    }

    if (data.notes !== undefined) {
      progress.notes = data.notes;
    }

    await progress.save();

    // Sync with Roadmap document & recalculate roadmap/phase stats
    const roadmap = await Roadmap.findOne({ _id: progress.roadmapId, userId });
    let phaseProgress: PhaseProgressSummary[] = [];

    if (roadmap) {
      let milestoneFound = false;
      for (const phase of roadmap.phases) {
        for (const m of phase.milestones) {
          if (m.milestoneId === progress.milestoneId || (m as any)._id?.toString() === progress.milestoneId) {
            m.completed = progress.status === 'completed';
            milestoneFound = true;
            break;
          }
        }
        if (milestoneFound) break;
      }

      // Compute overall completion percentage safely
      const allMilestones = roadmap.phases.flatMap((p) => p.milestones);
      const totalCount = allMilestones.length;
      const completedCount = allMilestones.filter((m) => m.completed).length;
      const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      roadmap.overallCompletionPercent = Math.min(100, Math.max(0, overallPercent));
      await roadmap.save();

      // Compute individual phase progress summaries
      phaseProgress = roadmap.phases.map((phase) => {
        const total = phase.milestones.length;
        const completed = phase.milestones.filter((m) => m.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        const phaseStatus: 'not_started' | 'in_progress' | 'completed' =
          percent === 100 ? 'completed' : percent > 0 ? 'in_progress' : 'not_started';

        return {
          phaseId: phase.phaseId,
          title: phase.title,
          totalMilestones: total,
          completedMilestones: completed,
          completionPercentage: percent,
          status: phaseStatus,
        };
      });

      // Check if phase transitioned to completed
      const currentPhase = phaseProgress.find((p) => p.phaseId === progress.phaseId);
      if (currentPhase && currentPhase.status === 'completed' && previousStatus !== 'completed') {
        emitProgressEvent(userId, PROGRESS_EVENTS.PHASE_COMPLETED, {
          userId,
          roadmapId: roadmap._id,
          phaseId: currentPhase.phaseId,
          title: currentPhase.title,
        });
      }

      // Skill acquisition check
      if (progress.status === 'completed' && previousStatus !== 'completed') {
        const milestoneObj = roadmap.phases
          .flatMap((p) => p.milestones)
          .find((m) => m.milestoneId === progress.milestoneId);

        let skillsToAcquire: string[] = [];
        if (milestoneObj && Array.isArray(milestoneObj.skills) && milestoneObj.skills.length > 0) {
          skillsToAcquire = milestoneObj.skills;
        } else if (milestoneObj && milestoneObj.title) {
          skillsToAcquire = [milestoneObj.title];
        }

        if (skillsToAcquire.length > 0) {
          await this.acquireSkillsFromMilestone(userId, skillsToAcquire);
        }
      }
    }

    // Get updated progress summary
    const summary = await this.getProgressSummary(userId);

    // Real-Time Socket Event Emissions
    emitProgressEvent(userId, PROGRESS_EVENTS.UPDATED, {
      roadmapId: progress.roadmapId,
      phaseId: progress.phaseId,
      milestoneId: progress.milestoneId,
      status: progress.status,
      completionPercentage: progress.completionPercentage,
      timeSpent: progress.timeSpent,
      completedAt: progress.completedAt,
    });

    if (progress.status === 'completed' && previousStatus !== 'completed') {
      emitProgressEvent(userId, PROGRESS_EVENTS.MILESTONE_COMPLETED, {
        roadmapId: progress.roadmapId,
        phaseId: progress.phaseId,
        milestoneId: progress.milestoneId,
      });
    } else if (progress.status === 'in_progress' && previousStatus === 'not_started') {
      emitProgressEvent(userId, PROGRESS_EVENTS.MILESTONE_STARTED, {
        roadmapId: progress.roadmapId,
        phaseId: progress.phaseId,
        milestoneId: progress.milestoneId,
      });
    }

    emitProgressEvent(userId, PROGRESS_EVENTS.SUMMARY_UPDATED, { summary });

    return { progress, summary, phaseProgress };
  }

  async acquireSkillsFromMilestone(userId: string, skillNames: string[]): Promise<string[]> {
    const profile = await LearnerProfile.findOne({ userId });
    if (!profile) return [];

    if (!Array.isArray(profile.skills)) {
      profile.skills = [];
    }

    const newlyAcquired: string[] = [];

    for (const name of skillNames) {
      const exists = profile.skills.some((s) => {
        if (typeof s === 'string') return s.toLowerCase() === name.toLowerCase();
        return s?.name?.toLowerCase() === name.toLowerCase();
      });

      if (!exists) {
        profile.skills.push({
          name,
          level: 'Intermediate',
          category: 'Acquired',
          acquiredAt: new Date(),
        });
        newlyAcquired.push(name);
      }
    }

    if (newlyAcquired.length > 0) {
      await profile.save();
      emitProgressEvent(userId, PROGRESS_EVENTS.SKILL_ACQUIRED, {
        userId,
        acquiredSkills: newlyAcquired,
        totalSkillsCount: profile.skills.length,
      });
    }

    return newlyAcquired;
  }

  async calculateStreak(userId: string): Promise<{ currentStreakDays: number; longestStreakDays: number }> {
    const records = await Progress.find({
      userId,
      updatedAt: { $exists: true },
    }).sort({ updatedAt: -1 });

    if (records.length === 0) {
      return { currentStreakDays: 0, longestStreakDays: 0 };
    }

    const uniqueDates = Array.from(
      new Set(records.map((r) => new Date(r.updatedAt).toISOString().split('T')[0]))
    ).sort().reverse();

    if (uniqueDates.length === 0) {
      return { currentStreakDays: 0, longestStreakDays: 0 };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    let currentStreak = 0;
    const mostRecentDate = uniqueDates[0];

    if (mostRecentDate === todayStr || mostRecentDate === yesterdayStr) {
      let expectedDate = new Date(mostRecentDate);
      for (const dateStr of uniqueDates) {
        const currentDate = new Date(dateStr);
        const expectedStr = expectedDate.toISOString().split('T')[0];
        if (dateStr === expectedStr) {
          currentStreak++;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else if (
          new Date(expectedDate.getTime() - 86400000).toISOString().split('T')[0] === dateStr
        ) {
          currentStreak++;
          expectedDate = new Date(currentDate);
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      currentStreakDays: currentStreak,
      longestStreakDays: Math.max(currentStreak, uniqueDates.length),
    };
  }

  async createProgressItem(
    userId: string,
    roadmapId: string,
    phaseId: string,
    milestoneId: string
  ): Promise<IProgress> {
    const existing = await Progress.findOne({ userId, milestoneId });
    if (existing) return existing;

    return Progress.create({
      userId,
      roadmapId,
      phaseId,
      milestoneId,
      status: 'not_started',
      completionPercentage: 0,
      timeSpent: 0,
    });
  }

  async getProgressSummary(userId: string, targetRoadmapId?: string) {
    let activeRoadmap = targetRoadmapId && mongoose.Types.ObjectId.isValid(targetRoadmapId)
      ? await Roadmap.findOne({ _id: targetRoadmapId, userId })
      : await Roadmap.findOne({ userId, status: 'active' }).sort({ createdAt: -1 });

    if (!activeRoadmap) {
      activeRoadmap = await Roadmap.findOne({ userId }).sort({ createdAt: -1 });
    }

    const profile = await LearnerProfile.findOne({ userId }).lean();

    let roadmapId = activeRoadmap?._id;
    const progressList = roadmapId ? await Progress.find({ userId, roadmapId }).sort({ updatedAt: -1 }) : await Progress.find({ userId }).sort({ updatedAt: -1 });

    let totalMilestones = 0;
    let completedMilestones = 0;
    const roadmapMilestoneMap = new Map<string, { title: string; phaseTitle: string }>();

    if (activeRoadmap && Array.isArray(activeRoadmap.phases) && activeRoadmap.phases.length > 0) {
      for (const phase of activeRoadmap.phases) {
        for (const m of phase.milestones || []) {
          roadmapMilestoneMap.set(m.milestoneId, { title: m.title, phaseTitle: phase.title });
        }
      }

      const roadmapMilestones = activeRoadmap.phases.flatMap((p) => p.milestones || []);
      totalMilestones = roadmapMilestones.length;

      const completedSet = new Set(
        progressList.filter((p) => p.status === 'completed').map((p) => p.milestoneId)
      );

      roadmapMilestones.forEach((m) => {
        if (m.completed || completedSet.has(m.milestoneId)) {
          completedMilestones++;
        }
      });
    } else {
      totalMilestones = progressList.length;
      completedMilestones = progressList.filter((p) => p.status === 'completed').length;
    }

    const inProgressMilestones = progressList.filter((p) => p.status === 'in_progress').length;
    const totalTimeSpent = progressList.reduce((acc, p) => acc + (p.timeSpent || 0), 0);

    const roadmapCompletionPercentage = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
    const { currentStreakDays, longestStreakDays } = await this.calculateStreak(userId);

    // 1. Learning Path Completion Metrics (courses, projects, assessments)
    const completedCoursesCount = Array.isArray(profile?.completedCourses) ? profile.completedCourses.length : 0;
    const completedProjectsCount = Array.isArray(profile?.projects) ? profile.projects.length : 0;
    const completedAssessmentsCount = Array.isArray(profile?.certifications) ? profile.certifications.length : 0;
    const completedLearningPathItems = completedCoursesCount + completedProjectsCount + completedAssessmentsCount;
    // Total target items baseline (determined deterministically against career goals / roadmap length)
    const totalLearningPathItems = Math.max(5, totalMilestones > 0 ? totalMilestones * 2 : 6, completedLearningPathItems);
    const learningPathCompletionPercentage = Math.min(100, Math.round((completedLearningPathItems / totalLearningPathItems) * 100));

    // 2. Skill Growth Delta Metrics (baseline profile creation vs current acquired)
    const currentSkillsCount = Array.isArray(profile?.skills) ? profile.skills.length : 0;
    const acquiredSkillsCount = Array.isArray(profile?.skills)
      ? profile.skills.filter((s: any) => typeof s === 'object' && s.category === 'Acquired').length
      : 0;

    let baselineSkillsCount = Array.isArray(profile?.baselineSkills) && profile.baselineSkills.length > 0
      ? profile.baselineSkills.length
      : Math.max(1, currentSkillsCount - acquiredSkillsCount);

    if (baselineSkillsCount > currentSkillsCount) {
      baselineSkillsCount = currentSkillsCount;
    }

    const skillsGainedCount = Math.max(0, currentSkillsCount - baselineSkillsCount + acquiredSkillsCount);
    const targetSkillsGrowthGoal = Math.max(6, baselineSkillsCount + 5);
    const skillGrowthPercentage = Math.min(100, Math.round((skillsGainedCount / (targetSkillsGrowthGoal - baselineSkillsCount)) * 100));

    // 3. Multi-dimensional Holistic Overall Progress Synthesis (40% Roadmap + 30% Learning Path + 30% Skill Delta)
    const overallPercentage = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          0.40 * roadmapCompletionPercentage +
          0.30 * learningPathCompletionPercentage +
          0.30 * skillGrowthPercentage
        )
      )
    );

    // Phase progress breakdown for selected roadmap
    const phaseBreakdown = activeRoadmap && Array.isArray(activeRoadmap.phases)
      ? activeRoadmap.phases.map((phase) => {
          const total = phase.milestones ? phase.milestones.length : 0;
          const completed = phase.milestones ? phase.milestones.filter((m) => m.completed).length : 0;
          const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
          return {
            phaseId: phase.phaseId,
            title: phase.title,
            description: phase.description || '',
            totalMilestones: total,
            completedMilestones: completed,
            completionPercentage: percent,
            status: percent === 100 ? ('completed' as const) : percent > 0 ? ('in_progress' as const) : ('not_started' as const),
          };
        })
      : [];

    // Rich, real-time activity feed mapping
    const recentActivity = progressList.slice(0, 10).map((p) => {
      const meta = roadmapMilestoneMap.get(p.milestoneId);
      const milestoneTitle = meta?.title || p.milestoneId;

      let title = `Activity on ${milestoneTitle}`;
      let type = 'Progress';

      if (p.status === 'completed') {
        title = `Completed: ${milestoneTitle}`;
        type = 'Completed';
      } else if (p.status === 'in_progress') {
        title = `In Progress: ${milestoneTitle}`;
        type = 'In Progress';
      } else {
        title = `Started: ${milestoneTitle}`;
        type = 'Started';
      }

      return {
        _id: p._id,
        id: p._id,
        milestoneId: p.milestoneId,
        title,
        milestoneTitle,
        phaseTitle: meta?.phaseTitle || '',
        status: p.status,
        type,
        notes: p.notes,
        timeSpent: p.timeSpent,
        updatedAt: p.updatedAt,
      };
    });

    return {
      activeRoadmapId: roadmapId || null,
      activeRoadmapTitle: activeRoadmap?.title || null,
      targetCareer: activeRoadmap?.targetCareer || profile?.targetCareer || null,
      totalMilestones,
      completedMilestones,
      completedMilestonesCount: completedMilestones,
      inProgressMilestones,
      remainingMilestones: Math.max(0, totalMilestones - completedMilestones),
      totalTimeSpentHours: totalTimeSpent,

      // Multi-dimensional Progress Metrics
      overallPercentage: Math.min(100, Math.max(0, overallPercentage)),
      roadmapCompletionPercentage,
      learningPathCompletionPercentage,
      skillGrowthPercentage,

      // Baseline vs Acquired Skill Growth Metrics
      baselineSkillsCount,
      currentSkillsCount,
      acquiredSkillsCount,
      skillsGainedCount,

      // Learning Path Execution Items
      completedCoursesCount,
      completedProjectsCount,
      completedAssessmentsCount,
      completedLearningPathItemsCount: completedLearningPathItems,

      currentStreakDays,
      longestStreakDays,
      phaseBreakdown,
      recentActivity,
    };
  }
}

export const progressService = new ProgressService();
