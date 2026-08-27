import { Router } from 'express';
import {
  analyzeProfile,
  getCareerRecommendations,
  compareCareers,
  analyzeSkillGap,
  generateAIRoadmap,
  adaptAIRoadmap,
  recommendProjects,
  recommendResources,
  generateFlowchart,
} from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/profile/analyze', analyzeProfile);
router.get('/careers/recommend', getCareerRecommendations);
router.post('/careers/compare', compareCareers);
router.post('/skill-gap', analyzeSkillGap);
router.post('/roadmap/generate', generateAIRoadmap);
router.post('/roadmap/adapt', adaptAIRoadmap);
router.post('/projects/recommend', recommendProjects);
router.post('/resources/recommend', recommendResources);
router.post('/flowchart/generate', generateFlowchart);

export default router;
