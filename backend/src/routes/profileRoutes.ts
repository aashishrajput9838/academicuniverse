import { Router } from 'express';
import {
  updateProfileController,
  getProfileController,
  getLinkedinProfileController,
  updateLinkedinProfileController,
  disconnectLinkedinProfileController,
} from '../controllers/profileController';
import { authenticateUser } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/', authenticateUser, getProfileController);

/**
 * @route   PUT /api/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/', authenticateUser, updateProfileController);

/**
 * @route   GET /api/profile/linkedin
 * @desc    Get LinkedIn connection status
 * @access  Private
 */
router.get('/linkedin', authenticateUser, getLinkedinProfileController);

/**
 * @route   PUT /api/profile/linkedin
 * @desc    Connect / Update LinkedIn URL
 * @access  Private
 */
router.put('/linkedin', authenticateUser, updateLinkedinProfileController);

/**
 * @route   DELETE /api/profile/linkedin
 * @desc    Disconnect LinkedIn profile
 * @access  Private
 */
router.delete('/linkedin', authenticateUser, disconnectLinkedinProfileController);

export default router;