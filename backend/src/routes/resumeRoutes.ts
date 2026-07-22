import express from 'express';
import multer from 'multer';
import { authenticateUser } from '../middleware/auth';
import {
  uploadTemplateController,
  getAvailableTemplatesController,
  processResumeController,
  getSavedResumeController,
  generateResumeController
} from '../controllers/resumeController';

const router = express.Router();

// Configure multer for memory storage (file buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Protect all routes with JWT auth middleware
router.use(authenticateUser);

// Faculty / Admin routes
router.post('/templates', upload.single('templateFile'), uploadTemplateController);

// Student routes
router.get('/templates', getAvailableTemplatesController);
router.post('/generate', processResumeController);
router.post('/generate-resume', generateResumeController);
router.get('/draft', getSavedResumeController);

export default router;
