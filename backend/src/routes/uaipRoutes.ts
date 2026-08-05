import express from 'express';
import multer from 'multer';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';
import { handleUaipUpload } from '../controllers/uaipController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

const router = express.Router();

router.use(authenticateUser, enforceOrgIsolation);
router.post('/upload', upload.single('file'), handleUaipUpload);

export default router;
