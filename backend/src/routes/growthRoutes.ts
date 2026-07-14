import express from 'express';
import multer from 'multer';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';
import { GrowthController } from '../modules/growth/growth.controller';
import { DocumentProcessingService } from '../shared/services/documentProcessing.service';
import { GrowthProfileService } from '../modules/growth/growthProfile.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

const documentProcessingService = new DocumentProcessingService();
const growthController = new GrowthController(documentProcessingService);
const growthProfileService = new GrowthProfileService();

router.use(authenticateUser, enforceOrgIsolation);

router.post('/documents', upload.single('file'), growthController.handleUpload);
router.get('/documents/:id', growthController.getDocumentStatus);
router.get('/profile/me', async (req, res, next) => {
  try {
    const organizationId = (req as any).organizationId;
    const authUserId = (req as any).userId;
    const profile = await growthProfileService.getProfile(organizationId, authUserId);
    return res.json({ status: 'success', data: profile });
  } catch (err) {
    next(err);
  }
});

export default router;
