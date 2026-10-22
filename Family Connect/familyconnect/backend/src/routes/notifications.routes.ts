import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { getNotifications, markAsRead } from '../controllers/notifications.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);

export default router;
