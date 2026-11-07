import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createTree, getTrees, getTreeById, inviteUserToTree, getTreeAccessList } from '../controllers/trees.controller';
import { getMe, setMe } from '../controllers/personIdentity.controller';
import { exportGedcom, previewGedcom, importGedcom } from '../controllers/interchange.controller';
import { getAuditTrail } from '../controllers/audit.controller';
import { getRelationshipPreferences, saveRelationshipPreferences } from '../controllers/relationshipPreferences.controller';

const router = Router();

router.use(requireAuth);

router.post('/', createTree);
router.get('/', getTrees);
router.get('/:id', getTreeById);
router.get('/:id/me', getMe);
router.put('/:id/me', setMe);
router.get('/:id/relationship-preferences', getRelationshipPreferences);
router.put('/:id/relationship-preferences', saveRelationshipPreferences);
router.post('/:id/invite', inviteUserToTree);
router.get('/:id/access', getTreeAccessList);
router.get('/:id/audit', getAuditTrail);
router.get('/:id/export/gedcom', exportGedcom);
router.post('/:id/import/gedcom/preview', previewGedcom);
router.post('/:id/import/gedcom', importGedcom);

export default router;
