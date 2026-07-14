import express from 'express';
import multer from 'multer';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';
import { GrowthController } from '../modules/growth/growth.controller';
import { DocumentProcessingService } from '../shared/services/documentProcessing.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

const documentProcessingService = new DocumentProcessingService();
const growthController = new GrowthController(documentProcessingService);

router.use(authenticateUser, enforceOrgIsolation);

router.post('/documents', upload.single('file'), growthController.handleUpload);
router.get('/documents/:id', growthController.getDocumentStatus);

export default router;

