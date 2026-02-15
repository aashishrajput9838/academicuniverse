import { Request, Response } from 'express';
import { RolePermission, User } from '../models';
import { sendResponse, sendError } from '../utils/response';

export const getRolePermissions = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    if (!roleId) return sendError(res, 400, 'roleId is required');

    const rolePermissions = await RolePermission.find({ roleId }).populate('permissionId', 'name').lean();
    return sendResponse(res, 200, { roleId, rolePermissions }, 'OK');
  } catch (error: any) {
    console.error('debugController.getRolePermissions error:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const getUserByEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    if (!email) return sendError(res, 400, 'email is required');

    const user = await User.findOne({ email }).populate(['organizationId', 'roleId']).lean();
    if (!user) return sendError(res, 404, 'User not found');

    return sendResponse(res, 200, { user }, 'OK');
  } catch (error: any) {
    console.error('debugController.getUserByEmail error:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const getRoleByName = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    if (!name) return sendError(res, 400, 'name is required');

    const role = await (await import('../models')).Role.findOne({ name }).lean();
    if (!role) return sendError(res, 404, 'Role not found');

    return sendResponse(res, 200, { role }, 'OK');
  } catch (error: any) {
    console.error('debugController.getRoleByName error:', error);
    return sendError(res, 500, 'Internal server error');
  }
};
