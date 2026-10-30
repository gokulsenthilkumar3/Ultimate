import { Router } from 'express';
import { getEventsByTree, createEvent } from '../controllers/events.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

// Routes
router.get('/:treeId', getEventsByTree);
router.post('/', createEvent);

export default router;
