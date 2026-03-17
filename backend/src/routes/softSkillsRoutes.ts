import { Router } from 'express';
import { improveSentence, getHistory } from '../controllers/softSkillsController';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Protect all routes
router.use(authenticateUser);

router.post('/improve', improveSentence);
router.get('/history', getHistory);

export default router;
