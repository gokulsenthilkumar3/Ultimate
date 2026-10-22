import { Router } from 'express';
import { getEventsByTree, createEvent } from '../controllers/events.controller';

const router = Router();

// Routes
router.get('/:treeId', getEventsByTree);
router.post('/', createEvent);

export default router;
