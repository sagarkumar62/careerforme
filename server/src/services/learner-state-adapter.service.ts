import mongoose from 'mongoose';
import { LearnerProfile, ILearnerProfile } from '../models/LearnerProfile';
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

    const completedCourses: string[] = [];
    if (Array.isArray(profile?.completedCourses)) {
      for (const c of profile.completedCourses) {
        if (c.title) completedCourses.push(c.title);
        if (c.url) completedCourses.push(c.url);
        if ((c as any).id) completedCourses.push((c as any).id);
        if ((c as any).course_id) completedCourses.push((c as any).course_id);
      }
    }

    const completedProjects: string[] = Array.isArray(profile?.projects)
      ? profile.projects.map((p) => p.title || (p as any).id || (p as any).project_id).filter(Boolean)
      : [];

    const completedAssessments: string[] = Array.isArray(profile?.certifications)
      ? profile.certifications.map((c) => c.title || (c as any).id || (c as any).assessment_id).filter(Boolean)
      : [];

    return {
      id: userId,
      user_id: userId,
      target_career: profile?.targetCareer || 'Software Engineer',
      experience_level: profile?.experienceLevel || 'Beginner',
      education_level: profile?.educationLevel || 'Bachelor',
      weekly_learning_hours: profile?.weeklyLearningHours || 10,
      skills: skillsMap,
      completed_courses: Array.from(new Set(completedCourses)),
      completed_projects: completedProjects,
      completed_assessments: completedAssessments,
    };
  }

  async syncFastAPILearnerResponse(
    userId: string,
    responseData: any
  ): Promise<{ profile: ILearnerProfile | null; newlyAcquiredSkills: string[] }> {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
    if (!isValidObjectId) {
      logger.info(`[LearnerStateAdapter] Skipping MongoDB persistence for non-ObjectId userId: '${userId}'`);
      return { profile: null, newlyAcquiredSkills: [] };
    }

    let profile = await LearnerProfile.findOne({ userId });

    if (!profile) {
      profile = new LearnerProfile({
        userId,
        skills: [],
        completedCourses: [],
        projects: [],
        certifications: [],
      });
    }

    if (!Array.isArray(profile.skills)) {
      profile.skills = [];
    }

    const newlyAcquiredSkills: string[] = [];
    const returnedLearner = responseData?.learner || {};
    const returnedSkills = returnedLearner.skills || {};

    // 1. Synchronize & merge skills without downgrading existing levels
    let incomingSkillsEntries: Array<[string, any]> = [];

    if (Array.isArray(returnedSkills)) {
      for (const item of returnedSkills) {
        if (typeof item === 'string') {
          incomingSkillsEntries.push([item, 3.0]);
        } else if (item && typeof item === 'object') {
          const sName = item.name || item.skill || item.skill_id || item.skillId;
          const sLvl = item.level ?? item.current_level ?? item.target_level ?? 3.0;
          if (sName) incomingSkillsEntries.push([sName, sLvl]);
        }
      }
    } else if (returnedSkills && typeof returnedSkills === 'object') {
      incomingSkillsEntries = Object.entries(returnedSkills);
    }

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
    const courseCompletion = responseData?.course_completion;
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
    const projectCompletion = responseData?.project_completion;
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
    const assessmentResult = responseData?.assessment_result;
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
