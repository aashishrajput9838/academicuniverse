import express from 'express';
import multer from 'multer';
import { authenticateUser } from '../middleware/auth';
import { extractMenu, saveMenu, getCurrentMenu } from '../controllers/messController';

const router = express.Router();

// Configure multer for memory storage (we just pass base64 to Gemini)
// Restrict to 5MB to avoid enormous payloads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Note: Mess representative only routes should technically ideally have a role check
router.post('/extract', authenticateUser, upload.single('menuFile'), extractMenu);
router.post('/save', authenticateUser, saveMenu);

// Public/student routes
router.get('/current', authenticateUser, getCurrentMenu);

export default router;
