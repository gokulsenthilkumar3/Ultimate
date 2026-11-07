import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createRelationship } from '../controllers/relationships.controller';
import { updateRelationship, deleteRelationship } from '../controllers/recordMutations.controller';

const router = Router();

router.use(requireAuth);

router.post('/', createRelationship);
router.put('/:id', updateRelationship);
router.delete('/:id', deleteRelationship);

export default router;
