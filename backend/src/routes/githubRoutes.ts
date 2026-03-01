import { Router } from 'express';
import { getProjectStats, refreshProjectStats } from '../controllers/githubController';
import { authenticateFirebaseUser } from '../middleware/auth';
import { 
  githubOAuthCallback, 
  connectGithub, 
  disconnectGithub, 
  getDeveloperStats 
} from '../controllers/githubOAuthController';

const router = Router();

/**
 * @route   GET /api/github/connect
 * @desc    Initiate GitHub OAuth flow
 * @access  Private (Student role only)
 */
router.get('/connect', authenticateFirebaseUser, connectGithub);

/**
 * @route   GET /api/github/callback
 * @desc    GitHub OAuth callback handler
 * @access  Public (GitHub redirects here)
 */
router.get('/callback', githubOAuthCallback);

/**
 * @route   DELETE /api/github/disconnect
 * @desc    Disconnect GitHub account
 * @access  Private (Student role only)
 */
router.delete('/disconnect', authenticateFirebaseUser, disconnectGithub);

/**
 * @route   GET /api/github/stats
 * @desc    Get processed developer statistics
 * @access  Private (Student role only)
 */
router.get('/stats', authenticateFirebaseUser, getDeveloperStats);

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