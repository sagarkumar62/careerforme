import mongoose from 'mongoose';
import { LearnerProfile, ILearnerProfile } from '../models/LearnerProfile';
import { Roadmap } from '../models/Roadmap';
import { Progress } from '../models/Progress';
import { progressService } from './progress.service';
import { emitProgressEvent, PROGRESS_EVENTS } from '../socket';
import { logger } from '../utils/logger';

export function parseSkillLevelNumber(lvl: any): number {
  if (typeof lvl === 'number') {
    return isNaN(lvl) ? 1.0 : lvl;
  }
  if (typeof lvl === 'string') {
    const parsed = parseFloat(lvl);
    if (!isNaN(parsed)) return parsed;
    const lower = lvl.toLowerCase().trim();
    if (lower === 'beginner' || lower === 'basic') return 2.0;
    if (lower === 'intermediate' || lower === 'medium') return 5.0;
    if (lower === 'advanced' || lower === 'expert') return 8.0;
  }
  return 1.0;
}

export class LearnerStateAdapterService {
  async buildFastAPILearnerContext(userId: string): Promise<Record<string, any>> {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
    const profile = isValidObjectId ? await LearnerProfile.findOne({ userId }).lean() : null;

    const skillsMap: Record<string, number> = {};

    if (profile?.skills) {
      if (Array.isArray(profile.skills)) {
        for (const item of profile.skills) {
          if (typeof item === 'string') {
            skillsMap[item.trim().toLowerCase()] = 3.0;
          } else if (item && typeof item === 'object') {
            const sName = item.name || item.skill || item.skill_id || item.skillId;
            const sLvl = item.level ?? item.current_level ?? item.target_level;
            if (sName && typeof sName === 'string') {
              skillsMap[sName.trim().toLowerCase()] = parseSkillLevelNumber(sLvl);
            }
          }
        }
      } else if (profile.skills && typeof profile.skills === 'object') {
        for (const [k, v] of Object.entries(profile.skills)) {
          if (typeof k === 'string') {
            skillsMap[k.trim().toLowerCase()] = parseSkillLevelNumber(v);
          }
        }
      }
    }

    const completedCourses = Array.isArray(profile?.completedCourses)
      ? profile.completedCourses.map((c) => c.title || c.url).filter(Boolean)
      : [];

    const completedProjects = Array.isArray(profile?.projects)
      ? profile.projects.map((p) => p.title).filter(Boolean)
      : [];

    const completedAssessments = Array.isArray(profile?.certifications)
      ? profile.certifications.map((c) => c.title).filter(Boolean)
      : [];

    const weeklyHoursVal = (profile as any)?.weeklyLearningHours || (profile as any)?.weeklyHoursCommitment || (profile as any)?.weeklyHours || (profile as any)?.weekly_hours || 10;

    return {
      id: userId,
      user_id: userId,
      target_career: (profile as any)?.targetCareerGoal || profile?.targetCareer || 'Full Stack Developer',
      experience_level: profile?.experienceLevel || 'Beginner',
      education_level: profile?.educationLevel || 'Bachelor',
      weekly_hours: weeklyHoursVal,
      weekly_learning_hours: weeklyHoursVal,
      skills: skillsMap,
      completed_courses: completedCourses,
      completed_projects: completedProjects,
      completed_assessments: completedAssessments,
    };
  }

  async syncFastAPILearnerResponse(
    userId: string,
    responseData: Record<string, any>,
    fallbackItem?: { type: 'course' | 'project' | 'assessment'; id: string; score?: number }
  ): Promise<{ profile: ILearnerProfile; newlyAcquiredSkills: string[] }> {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
    if (!isValidObjectId) {
      logger.info(`[LearnerStateAdapter] Skipping MongoDB persistence for non-ObjectId userId: '${userId}'`);
      return { profile: null as any, newlyAcquiredSkills: [] };
    }

    let profile = await LearnerProfile.findOne({ userId });

    if (!profile) {
      profile = new LearnerProfile({
        userId,
        skills: [],
        completedCourses: [],
        projects: [],
        certifications: [],
        baselineSkills: [],
      });
    }

    if (!Array.isArray(profile.skills)) {
      profile.skills = [];
    }

    const newlyAcquiredSkills: string[] = [];
    const incomingLearner = responseData?.learner || {};
    const incomingSkillsObj = incomingLearner.skills || responseData?.updated_skills || responseData?.skills || {};
    const incomingSkillsEntries = typeof incomingSkillsObj === 'object' && incomingSkillsObj !== null
      ? Object.entries(incomingSkillsObj)
      : [];

    for (const [rawName, rawLevel] of incomingSkillsEntries) {
      if (!rawName || typeof rawName !== 'string') continue;
      const canonName = rawName.trim();
      const returnedLevelNum = parseSkillLevelNumber(rawLevel);

      const existingIndex = profile.skills.findIndex((s) => {
        if (typeof s === 'string') return s.toLowerCase() === canonName.toLowerCase();
        return s?.name?.toLowerCase() === canonName.toLowerCase();
      });

      if (existingIndex >= 0) {
        const existingSkillObj = profile.skills[existingIndex];
        const existingLevelNum =
          typeof existingSkillObj === 'string'
            ? 3.0
            : parseSkillLevelNumber(existingSkillObj?.level);

        const updatedLevel = Math.max(existingLevelNum, returnedLevelNum);

        if (typeof existingSkillObj === 'object' && existingSkillObj !== null) {
          existingSkillObj.level = updatedLevel;
        } else {
          profile.skills[existingIndex] = {
            name: canonName,
            level: updatedLevel,
            category: 'Acquired',
            acquiredAt: new Date(),
          };
        }
      } else {
        profile.skills.push({
          name: canonName,
          level: returnedLevelNum,
          category: 'Acquired',
          acquiredAt: new Date(),
        });
        newlyAcquiredSkills.push(canonName);
      }
    }

    // 2. Synchronize completed courses
    let courseCompletion = responseData?.course_completion;
    if (!courseCompletion && fallbackItem?.type === 'course') {
      courseCompletion = {
        course_id: fallbackItem.id,
        title: fallbackItem.id,
        status: 'completed',
        completed_at: new Date().toISOString()
      };
    }

    if (courseCompletion && (courseCompletion.title || courseCompletion.course_id)) {
      const courseTitle = courseCompletion.title || courseCompletion.course_id;
      const courseId = courseCompletion.course_id || courseCompletion.id || '';
      const alreadySaved = profile.completedCourses.some(
        (c) => c.title.toLowerCase() === courseTitle.toLowerCase() || (courseId && c.url && c.url.toLowerCase() === courseId.toLowerCase())
      );
      if (!alreadySaved) {
        profile.completedCourses.push({
          title: courseTitle,
          platform: 'Adaptive AI',
          completionDate: new Date(),
          url: courseId,
        });
      }
    }

    // 3. Synchronize completed projects
    let projectCompletion = responseData?.project_completion;
    if (!projectCompletion && fallbackItem?.type === 'project') {
      projectCompletion = {
        project_id: fallbackItem.id,
        title: fallbackItem.id,
        status: 'completed',
        completed_at: new Date().toISOString()
      };
    }

    if (projectCompletion && (projectCompletion.title || projectCompletion.project_id)) {
      const projectTitle = projectCompletion.title || projectCompletion.project_id;
      const alreadySaved = profile.projects.some(
        (p) => p.title.toLowerCase() === projectTitle.toLowerCase()
      );
      if (!alreadySaved) {
        profile.projects.push({
          title: projectTitle,
          description: 'Completed adaptive AI project',
          techStack: projectCompletion.skills_demonstrated
            ? Object.keys(projectCompletion.skills_demonstrated)
            : [],
        });
      }
    }

    // 4. Synchronize assessment evidence
    let assessmentResult = responseData?.assessment_result;
    if (!assessmentResult && fallbackItem?.type === 'assessment') {
      const passed = (fallbackItem.score ?? 80) >= 70;
      assessmentResult = {
        assessment_id: fallbackItem.id,
        title: fallbackItem.id,
        score: fallbackItem.score ?? 80,
        success: true,
        passed,
        submitted_at: new Date().toISOString()
      };
    }

    if (assessmentResult && assessmentResult.success && assessmentResult.passed) {
      const assessmentTitle =
        assessmentResult.title || assessmentResult.assessment_id || 'Adaptive Assessment';
      const alreadySaved = profile.certifications.some(
        (c) => c.title.toLowerCase() === assessmentTitle.toLowerCase()
      );
      if (!alreadySaved) {
        profile.certifications.push({
          title: assessmentTitle,
          issuer: 'Adaptive AI Assessment Engine',
          issueDate: new Date(),
        });
      }
    }

    await profile.save();

    // 4.5. Synchronize completed item with active Roadmap & Progress documents in MongoDB
    try {
      const activeRoadmap = (await Roadmap.findOne({ userId, status: 'active' })) || (await Roadmap.findOne({ userId }).sort({ updatedAt: -1 }));
      if (activeRoadmap && Array.isArray(activeRoadmap.phases)) {
        let roadmapModified = false;
        const completedKeys = [
          courseCompletion?.course_id,
          courseCompletion?.title,
          projectCompletion?.project_id,
          projectCompletion?.title,
          assessmentResult?.assessment_id,
          assessmentResult?.title,
          ...newlyAcquiredSkills
        ]
          .filter(Boolean)
          .map((k) => String(k).toLowerCase().trim());

        for (const phase of activeRoadmap.phases) {
          if (!Array.isArray(phase.milestones)) continue;
          for (const m of phase.milestones) {
            if (m.completed) continue;
            const mTitle = (m.title || '').toLowerCase();
            const mId = (m.milestoneId || '').toLowerCase();
            const mSkill = ((m as any).targetSkill || '').toLowerCase();

            const isMatch = completedKeys.some(
              (key) => key && (mTitle.includes(key) || key.includes(mTitle) || mId.includes(key) || (mSkill && key.includes(mSkill)))
            );

            if (isMatch) {
              m.completed = true;
              roadmapModified = true;

              // Synchronize Progress record for this milestone
              await progressService.createProgressItem(userId, activeRoadmap._id.toString(), phase.phaseId, m.milestoneId);
              await Progress.updateOne(
                { userId, milestoneId: m.milestoneId },
                { $set: { status: 'completed', completionPercentage: 100, completedAt: new Date() } }
              );
            }
          }
        }

        if (roadmapModified) {
          const totalM = activeRoadmap.phases.reduce((acc, p) => acc + (p.milestones ? p.milestones.length : 0), 0);
          const compM = activeRoadmap.phases.reduce((acc, p) => acc + (p.milestones ? p.milestones.filter((m) => m.completed).length : 0), 0);
          activeRoadmap.overallCompletionPercent = totalM > 0 ? Math.round((compM / totalM) * 100) : 0;
          await activeRoadmap.save();
        }
      }
    } catch (rmSyncErr: any) {
      logger.warn(`[LearnerStateAdapter] Roadmap/Progress cross-sync warning: ${rmSyncErr.message}`);
    }

    // 5. Emit real-time Socket.IO progress events
    try {
      if (newlyAcquiredSkills.length > 0) {
        emitProgressEvent(userId, PROGRESS_EVENTS.SKILL_ACQUIRED, {
          userId,
          acquiredSkills: newlyAcquiredSkills,
          totalSkillsCount: profile.skills.length,
        });
      }

      const summary = await progressService.getProgressSummary(userId);

      emitProgressEvent(userId, PROGRESS_EVENTS.UPDATED, {
        userId,
        timestamp: new Date().toISOString(),
      });

      if (courseCompletion || projectCompletion || assessmentResult) {
        emitProgressEvent(userId, PROGRESS_EVENTS.MILESTONE_COMPLETED, {
          userId,
          completionType: courseCompletion
            ? 'course'
            : projectCompletion
              ? 'project'
              : 'assessment',
          details: courseCompletion || projectCompletion || assessmentResult,
        });
      }

      emitProgressEvent(userId, PROGRESS_EVENTS.SUMMARY_UPDATED, { summary });
    } catch (err: any) {
      logger.warn(`[LearnerStateAdapter] Failed to emit socket events: ${err.message}`);
    }

    return { profile, newlyAcquiredSkills };
  }
}

export const learnerStateAdapterService = new LearnerStateAdapterService();
