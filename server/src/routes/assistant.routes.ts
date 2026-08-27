import { Router } from 'express';
import { askAssistant } from '../controllers/assistant.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(optionalAuth);

router.post('/ask', askAssistant);

export default router;
