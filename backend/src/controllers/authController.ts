import { Request, Response } from 'express';
import { loginWithEmail, loginWithFirebase, registerUser } from '../services/authService';
import { sendResponse, sendError } from '../utils/response';

/**
 * Login with email and password
 * POST /api/auth/login
 */
export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    const result = await loginWithEmail(email, password);
    return sendResponse(res, 200, result, 'Login successful');
  } catch (error: any) {
    console.error('Login error:', error);
    return sendError(res, error.statusCode || 401, error.message);
  }
};

/**
 * Login/Register with Firebase OAuth
 * POST /api/auth/firebase-login
 */
export const firebaseLoginController = async (req: Request, res: Response) => {
  try {
    const { firebaseUid } = req.body;

    if (!firebaseUid) {
      return sendError(res, 400, 'Firebase UID is required');
    }

    const result = await loginWithFirebase(firebaseUid);
    return sendResponse(res, 200, result, 'Firebase login successful');
  } catch (error: any) {
    console.error('Firebase login error:', error);
    return sendError(res, error.statusCode || 401, error.message);
  }
};

/**
 * Register new user
 * POST /api/auth/register
 */
export const registerController = async (req: Request, res: Response) => {
  try {
    const { name, email, password, organizationId, roleId } = req.body;

    const user = await registerUser(name, email, password, organizationId, roleId);
    return sendResponse(res, 201, user, 'User registered successfully');
  } catch (error: any) {
    console.error('Registration error:', error);
    return sendError(res, error.statusCode || 400, error.message);
  }
};

/**
 * Get current user info
 * GET /api/auth/me
 */
export const getMeController = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    return sendResponse(res, 200, req.user, 'User data retrieved');
  } catch (error: any) {
    console.error('Get user error:', error);
    return sendError(res, 500, 'Failed to fetch user data');
  }
};
