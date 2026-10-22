import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createTree, getTrees, getTreeById, inviteUserToTree, getTreeAccessList } from '../controllers/trees.controller';

const router = Router();

router.use(requireAuth);

router.post('/', createTree);
router.get('/', getTrees);
router.get('/:id', getTreeById);
router.post('/:id/invite', inviteUserToTree);
router.get('/:id/access', getTreeAccessList);

export default router;
