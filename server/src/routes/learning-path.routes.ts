import { Router } from 'express';
import {
  generateLearningPath,
  completeCourse,
  completeProject,
  submitAssessment,
} from '../controllers/learning-path.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Attach authenticated session (req.user) whenever Authorization header or accessToken cookie is present
router.use((req, res, next) => {
  if (req.headers.authorization?.startsWith('Bearer ') || req.cookies?.accessToken) {
    return authenticate(req as any, res, next);
  }
  next();
});

router.post('/learning-path/generate', generateLearningPath);
router.post('/courses/:courseId/complete', completeCourse);
router.post('/projects/:projectId/complete', completeProject);
router.post('/assessments/:assessmentId/submit', submitAssessment);

export default router;
