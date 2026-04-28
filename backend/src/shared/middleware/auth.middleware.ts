/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/jwt';
import { AuthenticationError, AuthorizationError } from '../errors';

/**
 * Middleware: Verify JWT token and attach user to request
 */
export const authenticateUser = (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError('No token provided. Please log in.');
    }

    const decoded = verifyToken(token);

    // Attach user data to request object
    req.user = decoded;
    
    // Failsafe for corrupted tokens from previous bug:
    // If roleId is a stringified JSON object, extract the first 24-char hex ObjectId
    if (typeof req.user.roleId === 'string' && req.user.roleId.includes('_id')) {
      const match = req.user.roleId.match(/[0-9a-fA-F]{24}/);
      if (match) {
        req.user.roleId = match[0];
      }
    }

    req.organizationId = decoded.organizationId;

    next();
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token or authentication failed',
      error: error.message,
    });
  }
};

/**
 * Middleware: Check if user has specific permission
 */
export const authorize = (...requiredPermissions: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Super admins have all permissions
      if (req.user.isSuperAdmin) {
        return next();
      }

      // Check if user has at least one of the required permissions
      const hasPermission = requiredPermissions.some(permission =>
        req.user?.permissions.includes(permission)
      );

      if (!hasPermission) {
        throw new AuthorizationError(
          `User does not have permission(s): ${requiredPermissions.join(', ')}`
        );
      }

      next();
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(403).json({
        success: false,
        message: 'Authorization failed',
        error: error.message,
      });
    }
  };
};

/**
 * Extract Bearer token from Authorization header
 */
const extractToken = (req: any): string | null => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};
