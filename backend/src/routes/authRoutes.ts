import express from 'express';
import { loginController, firebaseLoginController, registerController, getMeController } from '../controllers/authController';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

/**
 * Public routes (no authentication required)
 */

// POST /api/auth/login
// Body: { email, password }
router.post('/login', loginController);

// POST /api/auth/firebase-login
// Body: { firebaseUid }
router.post('/firebase-login', firebaseLoginController);

// POST /api/auth/register
// Body: { name, email, password, organizationId, roleId }
router.post('/register', registerController);

/**
 * Protected routes (authentication required)
 */

// GET /api/auth/me
// Returns: Current user information from JWT
router.get('/me', authenticateUser, getMeController);

export default router;
