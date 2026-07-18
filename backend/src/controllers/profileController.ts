import { Request, Response } from 'express';
import { User } from '../models';
import { Person } from '../models/Person';
import { sendResponse, sendError } from '../utils/response';
import { Logger } from '../utils/logger';
import { toObjectId } from '../utils/mongooseHelpers';

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

    const { name, githubUsername, admissionYear } = req.body;
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (name) {
      user.name = name;
    }
    
    if (githubUsername !== undefined) {
      user.githubUsername = githubUsername;
    }

    await user.save();

    // Admission year is mandatory for students
    if (admissionYear === undefined || admissionYear === null || admissionYear === '') {
      return sendError(res, 400, 'Admission year is required');
    }

    const year = Number(admissionYear);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
      return sendError(res, 400, 'Admission year must be a valid four-digit year not in the future');
    }

    const person = await Person.findOne({
      organizationId: toObjectId(req.user.organizationId),
      userIds: toObjectId(req.user.userId),
    });
    
    if (person) {
      person.admissionYear = year;
      await person.save();
    }

    logger.info(`User profile updated for ${user.email}`, { userId: user._id, updatedFields: { name, githubUsername, admissionYear: year } });

    // Fetch updated Person for response
    const updatedPerson = await Person.findOne({
      organizationId: toObjectId(req.user.organizationId),
      userIds: toObjectId(req.user.userId),
    }).lean();

    return sendResponse(res, 200, {
      id: user._id,
      name: user.name,
      email: user.email,
      githubUsername: user.githubUsername,
      role: (user.roleId as any)?.name || 'USER',
      admissionYear: updatedPerson?.admissionYear,
    }, 'Profile updated successfully');
  } catch (error: any) {
    logger.error('Error updating profile:', error);
    return sendError(res, 500, 'Failed to update profile');
  }
};
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

    // Fetch Person for admissionYear
    const person = await Person.findOne({
      organizationId: toObjectId(req.user.organizationId),
      userIds: toObjectId(req.user.userId),
    }).lean();

    return sendResponse(res, 200, {
      id: user._id,
      name: user.name,
      email: user.email,
      githubUsername: user.githubUsername,
      role: (user.roleId as any)?.name || 'USER',
      admissionYear: person?.admissionYear,
    }, 'Profile retrieved successfully');
  } catch (error: any) {
    logger.error('Error retrieving profile:', error);
    return sendError(res, 500, 'Failed to retrieve profile');
  }
};