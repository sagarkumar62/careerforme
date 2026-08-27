import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { LearnerProfile } from '../models/LearnerProfile';
import { Recommendation } from '../models/Recommendation';
import { Roadmap } from '../models/Roadmap';
import { Progress } from '../models/Progress';
import { recommendationService } from '../services/recommendation.service';
import { progressService } from '../services/progress.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getDashboardData = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;

    // Parallel aggregated queries
    const [userDoc, profileDoc, latestRecommendationDoc, activeRoadmapDoc, progressSummary] =
      await Promise.all([
        User.findById(userId).select('-password').lean(),
        LearnerProfile.findOne({ userId }).lean(),
        Recommendation.findOne({ userId }).sort({ createdAt: -1 }).lean(),
        Roadmap.findOne({ userId, status: 'active' }).sort({ createdAt: -1 }).lean(),
        progressService.getProgressSummary(userId),
      ]);

    let targetCareer = (profileDoc as any)?.targetCareerGoal || profileDoc?.targetCareer || activeRoadmapDoc?.targetCareer;
    if (!targetCareer) {
      try {
        const recs = await recommendationService.getRecommendations(userId);
        if (recs && recs.length > 0) {
          targetCareer = recs[0].career;
        }
      } catch {
        // fallback
      }
    }
    if (!targetCareer) {
      targetCareer = 'Frontend Developer';
    }

    // Skill gap analysis
    let skillGapData = null;
    try {
      skillGapData = await recommendationService.getSkillGapAnalysis(userId, targetCareer);
    } catch (err) {
      skillGapData = {
        career: targetCareer,
        currentSkills: profileDoc?.skills || [],
        missingSkills: [],
        skillsToImprove: [],
        priority: [],
      };
    }

    // Calculate dynamic % AI Fit score based on user's current acquired skills and roadmap progress
    let recommendations: any[] = [];
    let targetRec = null;
    let matchScore = 75;

    try {
      recommendations = await recommendationService.getRecommendations(userId);
      targetRec = recommendations.find((r) => r.career.toLowerCase() === targetCareer.toLowerCase()) || recommendations[0];

      if (skillGapData && Array.isArray(skillGapData.details) && skillGapData.details.length > 0) {
        const totalReq = skillGapData.details.length;
        const mastered = skillGapData.details.filter((d: any) => d.category === 'strong' || d.currentLevel >= 3).length;
        const inProgress = skillGapData.details.filter((d: any) => d.category === 'needsWork').length;

        // Base skill match ratio (70% weight) + roadmap completion boost (30% weight)
        const skillRatio = (mastered + inProgress * 0.5) / totalReq;
        const roadmapBoost = ((progressSummary.overallPercentage || 0) / 100) * 0.3;

        const calculatedScore = Math.round((skillRatio * 0.7 + roadmapBoost) * 100);
        matchScore = Math.min(99, Math.max(35, calculatedScore));
      } else if (targetRec) {
        matchScore = targetRec.matchScore;
      }
    } catch (err) {
      console.warn('[DashboardController] Error computing AI fit match score:', err);
    }

    // Determine next actions for user
    const nextActions = [];
    if (!profileDoc?.targetCareer) {
      nextActions.push({ action: 'SET_TARGET_CAREER', label: 'Define your target career in your profile' });
    }
    if (!latestRecommendationDoc) {
      nextActions.push({ action: 'GENERATE_RECOMMENDATIONS', label: 'Get personalized AI career recommendations' });
    }
    if (!activeRoadmapDoc) {
      nextActions.push({ action: 'GENERATE_ROADMAP', label: 'Generate your step-by-step learning roadmap' });
    }
    if (progressSummary.remainingMilestones > 0) {
      nextActions.push({ action: 'CONTINUE_MILESTONE', label: 'Complete your next pending learning milestone' });
    }

    const payload = {
      user: userDoc,
      activeGoal: {
        careerId: targetRec?.id || 'active_goal',
        title: targetCareer,
        matchScore,
        estimatedMonths: targetRec ? parseInt(targetRec.estimatedTransition) || 6 : 6,
        scoreBreakdown: targetRec?.scoreBreakdown
      },
      careerGoal: {
        targetCareer,
        experienceLevel: profileDoc?.experienceLevel || 'Mid',
        weeklyLearningHours: profileDoc?.weeklyLearningHours || 10,
      },
      topRecommendations: recommendations.length > 0 ? recommendations : (latestRecommendationDoc?.recommendations || []),
      skillGap: skillGapData,
      skillGapSummary: {
        strong: skillGapData?.summary?.strongCount ?? skillGapData?.details?.filter((d: any) => d.category === 'strong').length ?? 0,
        needsWork: skillGapData?.summary?.needsWorkCount ?? skillGapData?.details?.filter((d: any) => d.category === 'needsWork').length ?? 0,
        missing: skillGapData?.summary?.missingCount ?? skillGapData?.details?.filter((d: any) => d.category === 'missing').length ?? 0,
      },
      roadmap: activeRoadmapDoc || null,
      progress: progressSummary,
      currentProgress: {
        overallCompletionPercent: progressSummary.overallPercentage ?? activeRoadmapDoc?.overallCompletionPercent ?? 0,
        completedMilestones: progressSummary.completedMilestones ?? 0,
        totalMilestones: progressSummary.totalMilestones ?? 0,
        learningHours: progressSummary.totalTimeSpentHours ?? 0,
        streakDays: progressSummary.currentStreakDays ?? 0,
      },
      nextActions,
      recentActivity: progressSummary.recentActivity || [],
    };

    res.status(200).json(new ApiResponse(200, payload, 'Dashboard data aggregated successfully'));

  } catch (error) {
    next(error);
  }
};
