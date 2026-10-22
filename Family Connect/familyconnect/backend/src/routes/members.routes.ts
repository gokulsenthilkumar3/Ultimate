import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createMember, getMembers, updateMember } from '../controllers/members.controller';

const router = Router();

router.use(requireAuth);

router.post('/', createMember);
router.get('/', getMembers);
router.put('/:id', updateMember);

export default router;
