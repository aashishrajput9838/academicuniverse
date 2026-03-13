import express from 'express';
import { processAIChat } from '../controllers/aiController';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Only authenticated students can access the AI emotional support assistant
// In this system, 'STUDENT' access is implicitly handled by authenticateUser 
// and we can add additional role checks if needed via authorize()
router.post('/ai-chat', authenticateUser, processAIChat);

export default router;
