import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload, AuthenticatedRequest } from '../utils/jwt';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { firebaseAuth } from '../config/firebaseAdmin';

/**
 * Middleware: Verify JWT token and attach user to request
 * This must be called on all protected routes
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
      // Fallback: If token was issued by Firebase, verify via firebaseAuth
      try {
        const firebaseDecoded = await firebaseAuth.verifyIdToken(token);
        const { uid, email } = firebaseDecoded;
        const { default: User } = await import('../models/User');
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
          decoded = {
            userId: uid,
            email: email || 'user@sharda.ac.in',
            organizationId: 'default-org-id',
            roleId: 'STUDENT',
            permissions: [],
            isSuperAdmin: false,
          };
        }
      } catch (fbErr) {
        throw jwtErr;
      }
    }

    // Attach user data to request object
    req.user = decoded;
    
    // Failsafe for corrupted tokens from previous bug:
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
 * Usage: router.post('/marks', authorize('ADD_MARKS'), controller)
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
 * Middleware: Enforce organization isolation
 * Automatically filters queries by organizationId
 */
export const enforceOrgIsolation = (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    // Ensure organizationId is set in request
    req.organizationId = req.user.organizationId;

    // If request contains orgId in body/params, validate it matches user's org
    const incomingOrgId = req.body?.organizationId || req.params?.organizationId;

    if (incomingOrgId && incomingOrgId !== req.user.organizationId) {
      throw new AuthorizationError('Cannot access data from other organizations');
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
      message: 'Organization isolation check failed',
    });
  }
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

/**
 * Middleware: Verify Firebase ID token and attach user to request
 * This is specifically for Firebase-authenticated users
 */
export const authenticateFirebaseUser = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError('No Firebase token provided. Please log in.');
    }

    // Verify Firebase ID token
    const decoded = await firebaseAuth.verifyIdToken(token);

    // Extract user information from Firebase token
    const { uid, email } = decoded;

    // Attach user data to request object
    req.firebaseUser = {
      firebaseUid: uid,
      email,
      // Additional Firebase claims if any
      ...decoded
    };

    // We still need to verify if this user exists in our database
    const { default: User } = await import('../models/User');
    const user = await User.findOne({
      $or: [
        { firebaseUid: uid },
        { email: email }
      ]
    }).populate('roleId');

    if (user) {
      req.user = {
        userId: user._id.toString(),
        email: user.email,
        organizationId: user.organizationId.toString(),
        role: (user.roleId as any).name,
        permissions: (user.roleId as any).permissions || [],
        isSuperAdmin: (user.roleId as any).name === 'SUPER_ADMIN'
      };
      req.organizationId = user.organizationId.toString();

      // Auto-link firebase uid if missing
      if (!user.firebaseUid) {
        user.firebaseUid = uid;
        await user.save();
      }
    } else if (process.env.NODE_ENV === 'development') {
      // Mock user fallback for development
      req.user = {
        userId: 'mock-user-id',
        email: email || 'demo@example.com',
        organizationId: 'mock-org-id',
        role: email?.includes('fa.') ? 'FACULTY' : 'STUDENT',
        permissions: [],
        isSuperAdmin: false
      };
    }

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
      message: 'Invalid Firebase token or authentication failed',
      error: error.message,
    });
  }
};
