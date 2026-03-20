import express from 'express';
import multer from 'multer';
import { processAIChat, processImageChat, getChatHistory } from '../controllers/aiController';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Only authenticated students can access the AI emotional support assistant
// In this system, 'STUDENT' access is implicitly handled by authenticateUser 
// and we can add additional role checks if needed via authorize()
router.post('/ai-chat', authenticateUser, processAIChat);
router.post('/image-chat', authenticateUser, upload.single('image'), processImageChat);
router.get('/history', authenticateUser, getChatHistory);

export default router;
