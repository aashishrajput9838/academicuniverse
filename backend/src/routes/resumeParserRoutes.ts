import express from 'express';
import multer from 'multer';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { ResumeParserController } from '../controllers/resumeParserController';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const controller = new ResumeParserController();

// All routes require authentication + organization isolation
router.use(authenticateUser, enforceOrgIsolation);

// Rate limiting: 10 uploads per 15 minutes per organization
const uploadRateLimiter = rateLimit({
  maxAttempts: 10,
  windowMinutes: 15,
  endpoint: '/api/resume/parse-upload',
});

// Resume parsing endpoints
router.post('/parse-upload', uploadRateLimiter, upload.single('file'), controller.parseUpload);
router.get('/parse-status/:processingId', controller.getParseStatus);

export default router;
