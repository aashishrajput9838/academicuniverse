import { Request, Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import User from '../models/User';
import Role from '../models/Role';

/**
 * Get all users for the current organization
 * GET /api/users
 */
export const getAllUsersController = async (req: any, res: Response) => {
    try {
        const users = await User.find({ organizationId: req.organizationId })
            .populate('roleId', 'name')
            .select('name email roleId isActive firebaseUid')
            .sort({ name: 1 });

        return sendResponse(res, 200, users, 'Users retrieved successfully');
    } catch (error: any) {
        console.error('Get all users error:', error);
        return sendError(res, 500, 'Failed to fetch users');
    }
};
