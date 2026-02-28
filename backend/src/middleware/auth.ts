import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload, AuthenticatedRequest } from '../utils/jwt';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { firebaseAuth } from '../config/firebaseAdmin';

/**
 * Middleware: Verify JWT token and attach user to request
 * This must be called on all protected routes
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
    // This would typically involve looking up the user by firebaseUid
    // For now, we'll just attach the Firebase user info
    // In a real implementation, you'd probably want to check if the user exists in your MongoDB
    
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
