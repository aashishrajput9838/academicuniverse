import { Router } from 'express';
import { getProjectStats, refreshProjectStats } from '../controllers/githubController';
import { authenticateFirebaseUser } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/github/projects
 * @desc    Get student's GitHub project statistics
 * @access  Private (Student role only)
 */
router.get('/projects', authenticateFirebaseUser, getProjectStats);

/**
 * @route   POST /api/github/projects/refresh
 * @desc    Refresh cached GitHub project statistics
 * @access  Private (Student role only)
 */
router.post('/projects/refresh', authenticateFirebaseUser, refreshProjectStats);

export default router;