import { Router } from 'express';
import { getProjectStats, refreshProjectStats, syncGithubData } from '../controllers/githubController';
import { authenticateUser } from '../middleware/auth';
import {
  githubOAuthCallback,
  connectGithub,
  disconnectGithub,
  getDeveloperStats,
  getGithubConnectionStatus
} from '../controllers/githubOAuthController';

const router = Router();

/**
 * @route   POST /api/github/connect
 * @desc    Initiate GitHub OAuth flow
 * @access  Private (Student role only)
 */
router.post('/connect', authenticateUser, connectGithub);

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
router.delete('/disconnect', authenticateUser, disconnectGithub);

/**
 * @route   GET /api/github/stats
 * @desc    Get processed developer statistics
 * @access  Private (Student role only)
 */
router.get('/stats', authenticateUser, getDeveloperStats);

/**
 * @route   GET /api/github/connection-status
 * @desc    Get GitHub OAuth connection status
 * @access  Private (Student role only)
 */
router.get('/connection-status', authenticateUser, getGithubConnectionStatus);

/**
 * @route   GET /api/github/projects
 * @desc    Get student's GitHub project statistics
 * @access  Private (Student role only)
 */
router.get('/projects', authenticateUser, getProjectStats);

/**
 * @route   POST /api/github/projects/refresh
 * @desc    Refresh cached GitHub project statistics
 * @access  Private (Student role only)
 */
router.post('/projects/refresh', authenticateUser, refreshProjectStats);

/**
 * @route   POST /api/github/sync
 * @desc    Sync GitHub data and trigger skill pipeline
 * @access  Private (Student role only)
 */
router.post('/sync', authenticateUser, syncGithubData);

export default router;