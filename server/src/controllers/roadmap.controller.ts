import { Response, NextFunction } from 'express';
import { roadmapService } from '../services/roadmap.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const generateRoadmap = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const targetCareer = (req.body.targetCareer || req.body.careerId || req.body.career || '').trim();
    const roadmap = await roadmapService.generateRoadmap(userId, targetCareer);

    try {
      const { emitProgressEvent, PROGRESS_EVENTS } = await import('../socket');
      const { progressService } = await import('../services/progress.service');
      const summary = await progressService.getProgressSummary(userId);
      emitProgressEvent(userId, PROGRESS_EVENTS.UPDATED, { userId, timestamp: new Date().toISOString() });
      emitProgressEvent(userId, PROGRESS_EVENTS.SUMMARY_UPDATED, { summary });
    } catch (err: any) {
      console.warn('[RoadmapController] Socket notification skipped:', err.message);
    }

    res.status(201).json(new ApiResponse(201, roadmap, 'Learning roadmap generated successfully'));
  } catch (error) {
    next(error);
  }
};

export const getRoadmaps = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const roadmaps = await roadmapService.getUserRoadmaps(userId);
    res.status(200).json(new ApiResponse(200, roadmaps, 'Roadmaps retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getRoadmapById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const id = req.params.id as string;
    const roadmap = await roadmapService.getRoadmapById(id, userId);
    res.status(200).json(new ApiResponse(200, roadmap, 'Roadmap retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateRoadmap = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const id = req.params.id as string;
    const { status, phaseId, milestoneId } = req.body;

    if (milestoneId) {
      const updated = await roadmapService.toggleRoadmapMilestone(userId, id, phaseId, milestoneId);
      res.status(200).json(new ApiResponse(200, updated, 'Roadmap milestone updated successfully'));
      return;
    }

    const updated = await roadmapService.updateRoadmapStatus(id, userId, status);
    res.status(200).json(new ApiResponse(200, updated, 'Roadmap updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteRoadmap = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const id = req.params.id as string;
    await roadmapService.deleteRoadmap(id, userId);
    res.status(200).json(new ApiResponse(200, null, 'Roadmap deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const getActiveRoadmap = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const roadmap = await roadmapService.getRoadmapById('active', userId);
    res.status(200).json(new ApiResponse(200, roadmap, 'Active learning roadmap retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getSupportedCareers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pythonAIService } = await import('../services/python-ai.service');
    const health = await pythonAIService.getHealth();
    const careers = health.loadedCareers || [];
    res.status(200).json(new ApiResponse(200, { count: careers.length, careers }, 'Supported roadmap careers retrieved'));
  } catch (error) {
    next(error);
  }
};
