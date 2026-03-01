import { Request, Response } from 'express';
import { User } from '../models';
import { sendResponse, sendError } from '../utils/response';
import { Logger } from '../utils/logger';

const logger = new Logger('profileController');

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    organizationId: string;
    roleId: string;
    permissions: string[];
    isSuperAdmin: boolean;
  };
}

/**
 * Update user profile
 * PUT /api/profile
 */
export const updateProfileController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    const { name, githubUsername } = req.body;
    
    // Find user by the same method as the GitHub controller - by Firebase UID
    // First, we need to get the Firebase UID from the JWT token or request
    // Since this uses authenticateUser middleware, we have req.user from JWT
    // But we need to get the Firebase UID to match with GitHub controller
    
    // Look up the user by the ID from the JWT to get their Firebase UID
    logger.info(`Attempting to find user by ID: ${req.user.userId} for profile update`);
    const user = await User.findById(req.user.userId);
    
    logger.info(`Found user for profile update: ${user ? user.name : 'NOT FOUND'}, current GitHub username: ${user ? user.githubUsername : 'N/A'}`);
    
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Update allowed fields
    if (name) {
      user.name = name;
    }
    
    if (githubUsername !== undefined) {
      user.githubUsername = githubUsername;
    }

    await user.save();

    logger.info(`User profile updated for ${user.email}`, { userId: user._id, updatedFields: { name, githubUsername } });

    return sendResponse(res, 200, {
      id: user._id,
      name: user.name,
      email: user.email,
      githubUsername: user.githubUsername,
    }, 'Profile updated successfully');
  } catch (error: any) {
    logger.error('Error updating profile:', error);
    return sendError(res, 500, 'Failed to update profile');
  }
};

/**
 * Get current user profile
 * GET /api/profile
 */
export const getProfileController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    return sendResponse(res, 200, {
      id: user._id,
      name: user.name,
      email: user.email,
      githubUsername: user.githubUsername,
      role: (user.roleId as any)?.name || 'USER',
    }, 'Profile retrieved successfully');
  } catch (error: any) {
    logger.error('Error retrieving profile:', error);
    return sendError(res, 500, 'Failed to retrieve profile');
  }
};