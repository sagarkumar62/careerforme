import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { pythonAIService } from '../services/python-ai.service';
import { learnerStateAdapterService } from '../services/learner-state-adapter.service';
import { LearnerProfile } from '../models/LearnerProfile';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

function getRequestId(req: AuthenticatedRequest): string {
  const reqId =
    req.headers['x-request-id'] ||
    req.headers['x-correlation-id'] ||
    (req as any).id ||
    `req_${Math.random().toString(36).substring(2, 10)}`;
  return Array.isArray(reqId) ? reqId[0] : reqId;
}

export const generateLearningPath = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const userId = req.user?._id || req.body?.learner?.id || req.body?.learner?.user_id || 'guest_user';

  try {
    const { goal, skill_gaps, learner } = req.body;

    if (!goal || typeof goal !== 'string' || !goal.trim()) {
      throw ApiError.badRequest('A valid goal string is required.');
    }

    const cleanGoal = goal.trim();

    // Synchronize target career into MongoDB LearnerProfile if user is authenticated
    const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
    if (isValidObjectId) {
      try {
        await LearnerProfile.updateOne(
          { userId },
          { $set: { targetCareer: cleanGoal } },
          { upsert: false }
        );
      } catch (profileErr: any) {
        logger.warn(`[LearningPathController] Could not update targetCareer in profile: ${profileErr.message}`);
      }
    }

    const mongoLearner = await learnerStateAdapterService.buildFastAPILearnerContext(userId);

    const mergedLearner = {
      ...mongoLearner,
      ...(learner && typeof learner === 'object' ? learner : {}),
      skills: {
        ...(mongoLearner?.skills || {}),
        ...(learner?.skills || {}),
      },
      completed_courses: Array.from(
        new Set([
          ...(mongoLearner?.completed_courses || []),
          ...(Array.isArray(learner?.completed_courses) ? learner.completed_courses : []),
        ])
      ),
      completed_projects: Array.from(
        new Set([
          ...(mongoLearner?.completed_projects || []),
          ...(Array.isArray(learner?.completed_projects) ? learner.completed_projects : []),
        ])
      ),
      completed_assessments: Array.from(
        new Set([
          ...(mongoLearner?.completed_assessments || []),
          ...(Array.isArray(learner?.completed_assessments) ? learner.completed_assessments : []),
        ])
      ),
    };

    logger.info(
      `=== EXPRESS LEARNING PATH DIAGNOSTIC === requestId: ${requestId}, userId: ${userId}, goal: "${goal.trim()}", input_gaps_count: ${Array.isArray(skill_gaps) ? skill_gaps.length : 0
      }`
    );

    const result = await pythonAIService.generateLearningPath({
      learner: mergedLearner,
      goal: goal.trim(),
      skill_gaps: Array.isArray(skill_gaps) ? skill_gaps : [],
    });

    const durationMs = Date.now() - startTime;
    logger.structured('info', {
      requestId,
      userId,
      operation: 'learning_path_generate',
      downstreamEndpoint: '/learning-path/generate',
      durationMs,
      statusCode: 200,
      success: true,
      details: {
        goal: goal.trim(),
        total_courses: result?.total_courses,
        total_milestones: result?.total_milestones,
        status: result?.status,
      },
    });

    res.status(200).json(new ApiResponse(200, result, 'Learning path generated successfully'));
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const statusCode = error?.statusCode || 500;
    logger.structured('error', {
      requestId,
      userId,
      operation: 'learning_path_generate',
      downstreamEndpoint: '/learning-path/generate',
      durationMs,
      statusCode,
      success: false,
      errorCategory: statusCode >= 500 ? 'DOWNSTREAM_OR_INTERNAL_FAILURE' : 'VALIDATION_FAILURE',
      errorMessage: error?.message || 'Internal server error',
    });
    next(error);
  }
};

export const completeCourse = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const userId = req.user?._id?.toString() || (req.user as any)?.id || req.body?.learner?.id || req.body?.learner?.user_id;
  const courseId = req.params.courseId as string;

  try {
    if (!courseId || typeof courseId !== 'string' || !courseId.trim()) {
      throw ApiError.badRequest('A valid courseId parameter is required.');
    }

    if (!userId && !req.body?.learner) {
      throw ApiError.badRequest('A valid learner object or authenticated session is required.');
    }

    const effectiveUserId = userId || 'guest_user';

    const mongoLearner = await learnerStateAdapterService.buildFastAPILearnerContext(effectiveUserId);
    const result = await pythonAIService.completeCourse(courseId, { learner: mongoLearner });

    if (effectiveUserId) {
      await learnerStateAdapterService.syncFastAPILearnerResponse(effectiveUserId, result || {}, { type: 'course', id: courseId });
    }

    const durationMs = Date.now() - startTime;
    logger.structured('info', {
      requestId,
      userId: effectiveUserId,
      operation: 'course_complete',
      downstreamEndpoint: `/courses/${encodeURIComponent(courseId)}/complete`,
      durationMs,
      statusCode: 200,
      success: true,
      details: { courseId },
    });

    res.status(200).json(new ApiResponse(200, result, 'Course completion processed successfully'));
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const statusCode = error?.statusCode || 500;
    logger.structured('error', {
      requestId,
      userId,
      operation: 'course_complete',
      downstreamEndpoint: `/courses/${encodeURIComponent(courseId || '')}/complete`,
      durationMs,
      statusCode,
      success: false,
      errorCategory: statusCode >= 500 ? 'DOWNSTREAM_OR_INTERNAL_FAILURE' : 'VALIDATION_FAILURE',
      errorMessage: error?.message || 'Internal server error',
    });
    next(error);
  }
};

export const completeProject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const userId = req.user?._id?.toString() || (req.user as any)?.id || req.body?.learner?.id || req.body?.learner?.user_id;
  const projectId = req.params.projectId as string;

  try {
    if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
      throw ApiError.badRequest('A valid projectId parameter is required.');
    }

    if (!userId && !req.body?.learner) {
      throw ApiError.badRequest('A valid learner object or authenticated session is required.');
    }

    const effectiveUserId = userId || 'guest_user';

    const mongoLearner = await learnerStateAdapterService.buildFastAPILearnerContext(effectiveUserId);
    const result = await pythonAIService.completeProject(projectId, { learner: mongoLearner });

    if (effectiveUserId) {
      await learnerStateAdapterService.syncFastAPILearnerResponse(effectiveUserId, result || {}, { type: 'project', id: projectId });
    }

    const durationMs = Date.now() - startTime;
    logger.structured('info', {
      requestId,
      userId: effectiveUserId,
      operation: 'project_complete',
      downstreamEndpoint: `/projects/${encodeURIComponent(projectId)}/complete`,
      durationMs,
      statusCode: 200,
      success: true,
      details: { projectId },
    });

    res.status(200).json(new ApiResponse(200, result, 'Project completion processed successfully'));
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const statusCode = error?.statusCode || 500;
    logger.structured('error', {
      requestId,
      userId,
      operation: 'project_complete',
      downstreamEndpoint: `/projects/${encodeURIComponent(projectId || '')}/complete`,
      durationMs,
      statusCode,
      success: false,
      errorCategory: statusCode >= 500 ? 'DOWNSTREAM_OR_INTERNAL_FAILURE' : 'VALIDATION_FAILURE',
      errorMessage: error?.message || 'Internal server error',
    });
    next(error);
  }
};

export const submitAssessment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const userId = req.user?._id?.toString() || (req.user as any)?.id || req.body?.learner?.id || req.body?.learner?.user_id;
  const assessmentId = req.params.assessmentId as string;

  try {
    const { score, user_answers } = req.body;

    if (!assessmentId || typeof assessmentId !== 'string' || !assessmentId.trim()) {
      throw ApiError.badRequest('A valid assessmentId parameter is required.');
    }

    if (typeof score !== 'number' || isNaN(score) || score < 0 || score > 100) {
      throw ApiError.badRequest('A valid numerical score between 0 and 100 is required.');
    }

    if (!userId && !req.body?.learner) {
      throw ApiError.badRequest('A valid learner object or authenticated session is required.');
    }

    const effectiveUserId = userId || 'guest_user';

    const mongoLearner = await learnerStateAdapterService.buildFastAPILearnerContext(effectiveUserId);
    const result = await pythonAIService.submitAssessment(assessmentId, {
      learner: mongoLearner,
      score,
      user_answers: user_answers && typeof user_answers === 'object' ? user_answers : {},
    });

    if (effectiveUserId) {
      await learnerStateAdapterService.syncFastAPILearnerResponse(effectiveUserId, result || {}, { type: 'assessment', id: assessmentId, score });
    }

    const durationMs = Date.now() - startTime;
    logger.structured('info', {
      requestId,
      userId,
      operation: 'assessment_submit',
      downstreamEndpoint: `/assessments/${encodeURIComponent(assessmentId)}/submit`,
      durationMs,
      statusCode: 200,
      success: true,
      details: { assessmentId, score }, // user_answers is intentionally omitted/redacted
    });

    res.status(200).json(new ApiResponse(200, result, 'Assessment submission processed successfully'));
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const statusCode = error?.statusCode || 500;
    logger.structured('error', {
      requestId,
      userId,
      operation: 'assessment_submit',
      downstreamEndpoint: `/assessments/${encodeURIComponent(assessmentId || '')}/submit`,
      durationMs,
      statusCode,
      success: false,
      errorCategory: statusCode >= 500 ? 'DOWNSTREAM_OR_INTERNAL_FAILURE' : 'VALIDATION_FAILURE',
      errorMessage: error?.message || 'Internal server error',
    });
    next(error);
  }
};
