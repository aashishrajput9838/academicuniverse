import { Request, Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import { authResolver } from '../auth/resolverInstance';
import { AuthenticationRequest } from '../auth/authRequest.dto';

/**
 * Unified login endpoint – expects a `provider` field and the provider‑specific payload.
 * POST /api/auth/login
 */
export const loginController = async (req: Request, res: Response) => {
  try {
    const { provider, ...payload } = req.body;
    // Build typed AuthenticationRequest based on provider
    let authRequest: AuthenticationRequest;
    if (provider === 'password') {
      const { email, password } = payload as { email?: unknown; password?: unknown };
      if (typeof email !== 'string' || typeof password !== 'string') {
        return sendError(res, 400, 'Invalid email or password payload');
      }
      authRequest = { provider: 'password', payload: { email, password } };
    } else if (provider === 'google') {
      const { idToken } = payload as { idToken?: unknown };
      if (typeof idToken !== 'string') {
        return sendError(res, 400, 'Invalid Google ID token payload');
      }
      authRequest = { provider: 'google', payload: { idToken } };
    } else {
      return sendError(res, 400, `Unsupported provider: ${provider}`);
    }

    const result = await authResolver.resolve(authRequest);
    return sendResponse(res, 200, result, 'Login successful');
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Login error:', error);
      // Some custom errors may attach a statusCode; we safely narrow via any here as a framework exception.
      return sendError(res, (error as any).statusCode || 401, error.message);
    }
    console.error('Unexpected login error:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

/**
 * Register new user – remains a thin wrapper around the legacy registerUser service.
 * POST /api/auth/register
 */
export const registerController = async (req: Request, res: Response) => {
  try {
    const { name, email, password, organizationId, roleId } = req.body;
    const user = await import('../services/authService').then(m => m.registerUser(name, email, password, organizationId, roleId));
    return sendResponse(res, 201, user, 'User registered successfully');
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Registration error:', error);
      return sendError(res, (error as any).statusCode || 400, error.message);
    }
    console.error('Unexpected registration error:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

/**
 * Get current user info – still uses the request.user populated by JWT middleware.
 * GET /api/auth/me
 */
export const getMeController = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }
    const { default: User } = await import('../models/User');
    const { default: Section } = await import('../models/Section');

    const user = await User.findById(req.user.userId).populate(['roleId', 'organizationId']).select('-password');
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const assignedSection = await Section.findOne({ representativeId: user._id });
    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      organization: (user.organizationId as any).name,
      organizationId: (user.organizationId as any)._id.toString(),
      role: (user.roleId as any).name,
      permissions: req.user.permissions,
      isSuperAdmin: req.user.isSuperAdmin,
      isSectionRep: !!assignedSection,
    };
    return sendResponse(res, 200, userData, 'User data retrieved');
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Get user error:', error);
      return sendError(res, 500, error.message);
    }
    console.error('Unexpected getMe error:', error);
    return sendError(res, 500, 'Internal server error');
  }
};
