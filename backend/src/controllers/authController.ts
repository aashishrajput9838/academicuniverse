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
    const { idToken } = req.body;

    if (!idToken) {
      return sendError(res, 400, 'Firebase ID token is required');
    }

    const result = await loginWithFirebase(idToken);
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

    // Import models inside the function to avoid circular dependencies
    const { default: User } = await import('../models/User');
    const { default: Role } = await import('../models/Role');
    const { default: Organization } = await import('../models/Organization');

    // Get the user from the database to get full details
    const user = await User.findById(req.user.userId)
      .populate('roleId')
      .populate('organizationId')
      .select('-password'); // Don't return password

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Format the response to match frontend expectations
    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      organization: (user.organizationId as any).name,
      organizationId: (user.organizationId as any)._id.toString(),
      role: (user.roleId as any).name,
      permissions: req.user.permissions,
      isSuperAdmin: req.user.isSuperAdmin
    };

    return sendResponse(res, 200, userData, 'User data retrieved');
  } catch (error: any) {
    console.error('Get user error:', error);
    return sendError(res, 500, 'Failed to fetch user data');
  }
};
