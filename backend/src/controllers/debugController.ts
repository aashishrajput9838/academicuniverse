import { Request, Response } from 'express';
import { RolePermission } from '../models';
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
