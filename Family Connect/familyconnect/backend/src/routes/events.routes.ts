import { Router } from 'express';
import { getEventsByTree, createEvent } from '../controllers/events.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { updateEvent, deleteEvent } from '../controllers/recordMutations.controller';
import { getEventsInRange } from '../controllers/eventRange.controller';

const router = Router();
router.use(requireAuth);

// Routes
router.get('/', getEventsInRange);
router.get('/:treeId', getEventsByTree);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;
