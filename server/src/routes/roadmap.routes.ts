import { Router } from 'express';
import {
  generateRoadmap,
  getRoadmaps,
  getRoadmapById,
  updateRoadmap,
  deleteRoadmap,
  getSupportedCareers,
  getActiveRoadmap,
} from '../controllers/roadmap.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/supported-careers', getSupportedCareers);
router.get('/active', getActiveRoadmap);
router.post('/generate', generateRoadmap);
router.get('/', getRoadmaps);
router.get('/:id', getRoadmapById);
router.patch('/:id', updateRoadmap);
router.delete('/:id', deleteRoadmap);

export default router;
