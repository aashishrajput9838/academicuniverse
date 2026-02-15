import { Role, Permission, RolePermission } from '../models';
import { NotFoundError, ConflictError } from '../utils/errors';

/**
 * Create a new role for an organization
 */
export const createRole = async (
  name: string,
  organizationId: string,
  description: string
): Promise<any> => {
  try {
    // Check if role already exists in this org
    const existingRole = await Role.findOne({ name, organizationId });
    if (existingRole) {
      throw new ConflictError(`Role '${name}' already exists in this organization`);
    }

    const role = new Role({
      name,
      organizationId,
      description,
    });

    await role.save();
    return role;
  } catch (error) {
    throw error;
  }
};

/**
 * Assign permission to a role
 */
export const assignPermissionToRole = async (
  roleId: string,
  permissionId: string
): Promise<any> => {
  try {
    // Check if already assigned
    const existing = await RolePermission.findOne({ roleId, permissionId });
    if (existing) {
      throw new ConflictError('This permission is already assigned to the role');
    }

    const rolePermission = new RolePermission({
      roleId,
      permissionId,
    });

    await rolePermission.save();
    return rolePermission;
  } catch (error) {
    throw error;
  }
};

/**
 * Remove permission from a role
 */
export const removePermissionFromRole = async (
  roleId: string,
  permissionId: string
): Promise<void> => {
  try {
    await RolePermission.deleteOne({ roleId, permissionId });
  } catch (error) {
    throw error;
  }
};

/**
 * Get all permissions for a role
 */
export const getRolePermissions = async (roleId: string): Promise<any[]> => {
  try {
    const rolePermissions = await RolePermission.find({ roleId })
      .populate('permissionId', 'name description category')
      .lean();

    return rolePermissions.map(rp => rp.permissionId);
  } catch (error) {
    throw error;
  }
};

/**
 * Get all roles for an organization
 */
export const getOrgRoles = async (organizationId: string): Promise<any[]> => {
  try {
    return await Role.find({ organizationId }).lean();
  } catch (error) {
    throw error;
  }
};
