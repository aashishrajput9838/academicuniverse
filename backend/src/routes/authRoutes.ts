import express, { Request, Response, NextFunction } from 'express';
import { loginController, registerController, getMeController } from '../controllers/authController';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

/**
 * Public routes (no authentication required)
 */
// POST /api/auth/login
router.post('/login', loginController);

// POST /api/auth/firebase-login (removed)

// POST /api/auth/register
router.post('/register', registerController);

/**
 * Protected routes (authentication required)
 */
router.get('/me', (req: Request, res: Response, next: NextFunction) => authenticateUser(req as any, res, next), getMeController);

export default router;
