import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  firebaseUid?: string;
  organizationId: string;
  roleId: string;
  permissions: string[];
  isSuperAdmin: boolean;
  name?: string;
}

export interface AuthenticatedRequest {
  user?: JWTPayload;
  organizationId?: string;
}

import { JWT_SECRET, JWT_EXPIRY } from '../config/constants';

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
}

// Refresh token generation – short-lived access token plus longer-lived refresh token
export const generateRefreshToken = (payload: { userId: string; email: string }): string => {
  const REFRESH_EXPIRY = (process.env.REFRESH_TOKEN_EXPIRY || '30d') as string;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRY } as any);
};;
