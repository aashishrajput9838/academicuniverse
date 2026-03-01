import { Router } from 'express';
import { updateProfileController, getProfileController } from '../controllers/profileController';
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

export default router;