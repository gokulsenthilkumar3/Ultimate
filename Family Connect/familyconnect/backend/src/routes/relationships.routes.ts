import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createRelationship } from '../controllers/relationships.controller';

const router = Router();

router.use(requireAuth);

router.post('/', createRelationship);

export default router;
