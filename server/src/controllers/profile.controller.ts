import { Response, NextFunction } from 'express';
import { profileService } from '../services/profile.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const profile = await profileService.getProfileByUserId(userId);
    res.status(200).json(new ApiResponse(200, profile, 'Learner profile retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const createProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const profile = await profileService.createOrUpdateProfile(userId, req.body);
    res.status(201).json(new ApiResponse(201, profile, 'Learner profile created successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const profile = await profileService.replaceProfile(userId, req.body);
    res.status(200).json(new ApiResponse(200, profile, 'Learner profile updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const patchProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const profile = await profileService.updateProfilePartial(userId, req.body);
    res.status(200).json(new ApiResponse(200, profile, 'Learner profile updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    await profileService.deleteProfile(userId);
    res.status(200).json(new ApiResponse(200, null, 'Learner profile deleted successfully'));
  } catch (error) {
    next(error);
  }
};

