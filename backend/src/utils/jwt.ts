import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  firebaseUid?: string;
  organizationId: string;
  roleId: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface AuthenticatedRequest {
  user?: JWTPayload;
  organizationId?: string;
}

const JWT_SECRET = (process.env.JWT_SECRET || 'your-secret-key-change-in-production') as string;
const JWT_EXPIRY = (process.env.JWT_EXPIRY || '7d') as string;

/**
 * Generate JWT token with user data and permissions
 */
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY } as any);
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Decode JWT token without verification
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};
