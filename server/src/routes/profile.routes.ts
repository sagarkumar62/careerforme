import { Router } from 'express';
import { getProfile, createProfile, updateProfile, patchProfile, deleteProfile } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { profileSchema, profileUpdateSchema } from '../validators/profile.validator';

const router = Router();

router.use(authenticate);

router.get('/', getProfile);
router.post('/', validateRequest(profileSchema), createProfile);
router.put('/', validateRequest(profileSchema), updateProfile);
router.patch('/', validateRequest(profileUpdateSchema), patchProfile);
router.delete('/', deleteProfile);

export default router;

