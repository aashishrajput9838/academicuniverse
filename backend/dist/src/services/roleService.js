"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrgRoles = exports.getRolePermissions = exports.removePermissionFromRole = exports.assignPermissionToRole = exports.createRole = void 0;
const models_1 = require("../models");
const errors_1 = require("../utils/errors");
/**
 * Create a new role for an organization
 */
const createRole = async (name, organizationId, description) => {
    try {
        // Check if role already exists in this org
        const existingRole = await models_1.Role.findOne({ name, organizationId });
        if (existingRole) {
            throw new errors_1.ConflictError(`Role '${name}' already exists in this organization`);
        }
        const role = new models_1.Role({
            name,
            organizationId,
            description,
        });
        await role.save();
        return role;
    }
    catch (error) {
        throw error;
    }
};
exports.createRole = createRole;
/**
 * Assign permission to a role
 */
const assignPermissionToRole = async (roleId, permissionId) => {
    try {
        // Check if already assigned
        const existing = await models_1.RolePermission.findOne({ roleId, permissionId });
        if (existing) {
            throw new errors_1.ConflictError('This permission is already assigned to the role');
        }
        const rolePermission = new models_1.RolePermission({
            roleId,
            permissionId,
        });
        await rolePermission.save();
        return rolePermission;
    }
    catch (error) {
        throw error;
    }
};
exports.assignPermissionToRole = assignPermissionToRole;
/**
 * Remove permission from a role
 */
const removePermissionFromRole = async (roleId, permissionId) => {
    try {
        await models_1.RolePermission.deleteOne({ roleId, permissionId });
    }
    catch (error) {
        throw error;
    }
};
exports.removePermissionFromRole = removePermissionFromRole;
/**
 * Get all permissions for a role
 */
const getRolePermissions = async (roleId) => {
    try {
        const rolePermissions = await models_1.RolePermission.find({ roleId })
            .populate('permissionId', 'name description category')
            .lean();
        return rolePermissions.map(rp => rp.permissionId);
    }
    catch (error) {
        throw error;
    }
};
exports.getRolePermissions = getRolePermissions;
/**
 * Get all roles for an organization
 */
const getOrgRoles = async (organizationId) => {
    try {
        return await models_1.Role.find({ organizationId }).lean();
    }
    catch (error) {
        throw error;
    }
};
exports.getOrgRoles = getOrgRoles;
