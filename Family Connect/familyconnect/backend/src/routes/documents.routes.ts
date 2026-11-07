import { Router } from 'express';
import { getDocumentsByTree, uploadDocument, upload, downloadDocument } from '../controllers/documents.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { deleteDocument } from '../controllers/recordMutations.controller';

const router = Router();
router.use(requireAuth);
router.get('/upload/:filename', downloadDocument);
router.get('/file/:documentId', downloadDocument);

router.get('/:treeId', getDocumentsByTree);

// Important: the 'file' parameter matches the form-data key we will use in the frontend
router.post('/', upload.single('file'), uploadDocument);
router.delete('/:id', deleteDocument);

export default router;
