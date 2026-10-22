import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { generateBio } from '../controllers/ai.controller';

const router = Router();

router.use(requireAuth);

router.post('/generate-bio', generateBio);

export default router;
