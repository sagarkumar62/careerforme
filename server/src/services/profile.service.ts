import { LearnerProfile, ILearnerProfile } from '../models/LearnerProfile';
import { ApiError } from '../utils/ApiError';
import { ProfileInput, ProfileUpdateInput } from '../validators/profile.validator';

export class ProfileService {
  private triggerBackgroundAiSync(userId: string, targetCareer?: string) {
    // Execute AI fit recalculation, roadmap generation, & socket emissions in background without blocking HTTP response
    (async () => {
      try {
        const { recommendationService } = await import('./recommendation.service');
        const { roadmapService } = await import('./roadmap.service');
        const { emitProgressEvent, PROGRESS_EVENTS } = await import('../socket');
        const { progressService } = await import('./progress.service');

        await recommendationService.getRecommendations(userId);

        if (targetCareer) {
          await roadmapService.generateRoadmap(userId, targetCareer);
        }

        const summary = await progressService.getProgressSummary(userId);

        emitProgressEvent(userId, PROGRESS_EVENTS.UPDATED, { userId, timestamp: new Date().toISOString() });
        emitProgressEvent(userId, PROGRESS_EVENTS.SUMMARY_UPDATED, { summary });
      } catch (err) {
        console.warn('[ProfileService] Background AI fit & roadmap sync skipped:', err);
      }
    })();
  }

  async getProfileByUserId(userId: string): Promise<ILearnerProfile> {
    let profile = await LearnerProfile.findOne({ userId });
    if (!profile) {
      // Auto-create blank profile if not present
      profile = await LearnerProfile.create({
        userId,
        skills: [],
        interests: [],
        careerGoals: [],
        learningPreferences: [],
      });
    }
    return profile;
  }

  async createOrUpdateProfile(userId: string, data: ProfileInput): Promise<ILearnerProfile> {
    let profile = await LearnerProfile.findOne({ userId });

    const normalizedData: any = { ...data };
    if (data.targetCareerGoal && !data.targetCareer) {
      normalizedData.targetCareer = data.targetCareerGoal;
    }
    if (data.learningPreferences && typeof data.learningPreferences === 'object' && !Array.isArray(data.learningPreferences)) {
      if (data.learningPreferences.weeklyHours && !data.weeklyLearningHours) {
        normalizedData.weeklyLearningHours = data.learningPreferences.weeklyHours;
      }
    }

    if (profile) {
      Object.assign(profile, normalizedData);
      if (!profile.baselineSkills || profile.baselineSkills.length === 0) {
        profile.baselineSkills = Array.isArray(profile.skills) ? [...profile.skills] : [];
      }
      await profile.save();
    } else {
      profile = await LearnerProfile.create({
        userId,
        ...normalizedData,
        baselineSkills: Array.isArray(normalizedData.skills) ? [...normalizedData.skills] : [],
      });
    }

    const targetCareer = normalizedData.targetCareer || normalizedData.targetCareerGoal || profile.targetCareer;
    this.triggerBackgroundAiSync(userId, targetCareer);

    return profile;
  }

  async replaceProfile(userId: string, data: ProfileInput): Promise<ILearnerProfile> {
    let profile = await LearnerProfile.findOne({ userId });

    const normalizedData: any = { ...data };
    if (data.targetCareerGoal && !data.targetCareer) {
      normalizedData.targetCareer = data.targetCareerGoal;
    }

    if (!profile) {
      profile = new LearnerProfile({ userId, ...normalizedData });
    } else {
      profile.set(normalizedData);
      profile.userId = userId as any;
    }

    await profile.save();

    const targetCareer = normalizedData.targetCareer || normalizedData.targetCareerGoal || profile.targetCareer;
    this.triggerBackgroundAiSync(userId, targetCareer);

    return profile;
  }

  async updateProfilePartial(userId: string, data: ProfileUpdateInput): Promise<ILearnerProfile> {
    const profile = await LearnerProfile.findOne({ userId });
    if (!profile) {
      throw ApiError.notFound('Learner profile not found.');
    }

    const normalizedData: any = { ...data };
    if (data.targetCareerGoal && !data.targetCareer) {
      normalizedData.targetCareer = data.targetCareerGoal;
    }

    Object.assign(profile, normalizedData);
    await profile.save();

    const targetCareer = normalizedData.targetCareer || normalizedData.targetCareerGoal || profile.targetCareer;
    this.triggerBackgroundAiSync(userId, targetCareer);

    return profile;
  }

  async deleteProfile(userId: string): Promise<boolean> {
    await LearnerProfile.deleteOne({ userId });
    return true;
  }
}

export const profileService = new ProfileService();
