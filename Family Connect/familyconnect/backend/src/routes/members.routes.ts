import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createMember, getMembers, getMember, updateMember } from '../controllers/members.controller';

const router = Router();

router.use(requireAuth);

router.post('/', createMember);
router.get('/', getMembers);
router.get('/:id', getMember);
router.put('/:id', updateMember);

export default router;
