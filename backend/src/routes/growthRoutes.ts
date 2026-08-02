import express from 'express';
import multer from 'multer';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';
import { GrowthController } from '../modules/growth/growth.controller';
import { GrowthProfileService } from '../modules/growth/growthProfile.service';
import { GrowthProjectionService } from '../modules/growth/growthProjection.service';
import { UaipFacade } from '../shared/application/UaipFacade';
import { sendResponse } from '../utils/response';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

// Instantiate the facade — the only UAIP object that crosses the boundary.
const uaipFacade = new UaipFacade();
const growthController = new GrowthController(uaipFacade);
const growthProfileService = new GrowthProfileService();
const growthProjectionService = new GrowthProjectionService();

router.use(authenticateUser, enforceOrgIsolation);

router.get('/me', growthController.getMyGrowthHub);
router.get('/projection/me', async (req, res, next) => {
  try {
    const organizationId = (req as any).organizationId;
    const authUserId = (req as any).user?.userId;

    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!organizationId) {
      return res.status(403).json({ success: false, message: 'Organization context is required' });
    }

    const projection = await growthProjectionService.buildProjection(authUserId, organizationId);
    return sendResponse(res, 200, projection, 'Growth projection retrieved successfully');
  } catch (err) {
    next(err);
  }
});
router.get('/uploads', growthController.getUploadHistory);
router.get('/documents', growthController.getUploadHistory);
router.get('/uploads/:processingId', growthController.getProcessingStatus);
router.post('/documents', upload.single('file'), growthController.handleUpload);
router.get('/documents/:id/file', growthController.streamDocumentFile);
router.get('/documents/:id/thumbnail', growthController.streamDocumentThumbnail);
router.get('/documents/:id', growthController.getDocumentStatus);
router.get('/profile/me', async (req, res, next) => {
  try {
    const organizationId = (req as any).organizationId;
    const authUserId = (req as any).user?.userId;

    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!organizationId) {
      return res.status(403).json({ success: false, message: 'Organization context is required' });
    }

    const profile = await growthProfileService.getProfile(organizationId, authUserId);
    return sendResponse(res, 200, profile, 'Growth profile retrieved successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
