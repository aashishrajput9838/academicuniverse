/**
 * Authentication & Authorization Middleware
 * Verifies JWT tokens & Firebase ID tokens and attaches user to request
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../../utils/jwt';
import { AuthenticationError, AuthorizationError } from '../errors';
import { firebaseAuth } from '../../config/firebaseAdmin';

/**
 * Extract Bearer token from Authorization header
 */
const extractToken = (req: any): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
};

/**
 * Middleware: Verify JWT token or Firebase ID token and attach user to request
 */
export const authenticateUser = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError('No token provided. Please log in.');
    }

    let decoded: JWTPayload;
    try {
      decoded = verifyToken(token);
    } catch (jwtErr: any) {
      // Fallback: Verify Firebase ID token
      try {
        const firebaseDecoded = await firebaseAuth.verifyIdToken(token);
        const { uid, email } = firebaseDecoded;
        const { default: User } = await import('../../models/User');
        const user = await User.findOne({
          $or: [{ firebaseUid: uid }, { email: email?.toLowerCase() }]
        });

        if (user) {
          decoded = {
            userId: user._id.toString(),
            email: user.email,
            organizationId: user.organizationId.toString(),
            roleId: (user.roleId as any)?.toString() || 'STUDENT',
            permissions: [],
            isSuperAdmin: false,
            name: user.name,
          };
        } else {
          const { default: Organization } = await import('../../models/Organization');
          const defaultOrg = await Organization.findOne() || { _id: '66a1b2c3d4e5f67890123456' };
          decoded = {
            userId: uid,
            email: email || 'user@sharda.ac.in',
            organizationId: (defaultOrg as any)._id?.toString() || 'default-org-id',
            roleId: 'STUDENT',
            permissions: [],
            isSuperAdmin: false,
          };
        }
      } catch (fbErr) {
        throw jwtErr;
      }
    }

    req.user = decoded;

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

      if (req.user.isSuperAdmin) {
        return next();
      }

      const hasPermission = requiredPermissions.some(permission =>
        req.user?.permissions?.includes(permission)
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
