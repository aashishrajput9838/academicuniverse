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

// Temporary test route to trigger the AI Error Logger MCP
router.get('/test-error', (req, res) => {
    throw new Error('TEST_CRASH: Deliberate testing simulation of a deep system failure. Variable X is undefined.');
});

export default router;
