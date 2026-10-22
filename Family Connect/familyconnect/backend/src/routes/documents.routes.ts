import { Router } from 'express';
import { getDocumentsByTree, uploadDocument, upload } from '../controllers/documents.controller';

const router = Router();

router.get('/:treeId', getDocumentsByTree);

// Important: the 'file' parameter matches the form-data key we will use in the frontend
router.post('/', upload.single('file'), uploadDocument);

export default router;
