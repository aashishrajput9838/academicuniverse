import User from '../models/User';
import Organization, { IOrganization } from '../models/Organization';
import Role, { IRole } from '../models/Role';
import Section from '../models/Section';
import { getUserPermissions } from './authService';
import { detectRoleFromEmail } from './roleDetectionService';
import { AuthPayload } from '../auth/provider';
import { Types } from 'mongoose';

export interface CanonicalUserDTO {
  _id: string;
  name: string;
  email: string;
  organizationId: string;
  organizationName: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  isSuperAdmin: boolean;
  isSectionRep: boolean;
}

export class UserService {
  /**
   * Find an existing user linked to the AuthPayload or create/update canonical user.
   * Eliminates E11000 duplicate key errors by performing case-insensitive & provider ID queries and catching conflicts.
   */
  static async findOrCreateCanonicalUser(authPayload: AuthPayload): Promise<CanonicalUserDTO> {
    const cleanEmail = authPayload.email ? authPayload.email.trim().toLowerCase() : '';
    const emailRegex = cleanEmail ? new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;

    // 1. Query user by case-insensitive email OR providerUserId
    const queryConditions: any[] = [];
    if (emailRegex) queryConditions.push({ email: emailRegex });
    if (authPayload.providerUserId) queryConditions.push({ firebaseUid: authPayload.providerUserId });

    let user = await User.findOne({ $or: queryConditions })
      .populate([{ path: 'organizationId', select: 'name' }, { path: 'roleId', select: 'name' }]);

    if (user) {
      // If user exists but firebaseUid was missing or changed, link it cleanly
      if (!user.firebaseUid && authPayload.providerUserId) {
        user.firebaseUid = authPayload.providerUserId;
        await user.save();
      }
    } else {
      // 2. Resolve default organization & role
      const organization = await Organization.findOne({
        $or: [{ slug: 'sharda-university' }, { name: /sharda/i }]
      }) || await Organization.findOne();

      if (!organization) {
        throw new Error('Default organization not found in database. Please seed the database.');
      }

      let roleName = 'STUDENT';
      try {
        const roleInfo = detectRoleFromEmail(cleanEmail);
        roleName = roleInfo.role;
      } catch {
        roleName = 'STUDENT';
      }

      let role = await Role.findOne({ name: roleName, organizationId: organization._id })
        || await Role.findOne({ name: roleName })
        || await Role.findOne({ organizationId: organization._id })
        || await Role.findOne();

      if (!role) {
        throw new Error(`No roles found in database. Please seed the database.`);
      }

      try {
        user = new User({
          name: authPayload.rawProfile?.name || (cleanEmail ? cleanEmail.split('@')[0] : 'Student'),
          email: cleanEmail,
          firebaseUid: authPayload.providerUserId,
          organizationId: organization._id,
          roleId: role._id,
          isActive: true
        });
        await user.save();
        await user.populate([{ path: 'organizationId', select: 'name' }, { path: 'roleId', select: 'name' }]);
      } catch (saveErr: any) {
        // Fallback for E11000 duplicate key error race conditions
        if (saveErr.code === 11000 || saveErr.message?.includes('E11000')) {
          user = await User.findOne({ $or: queryConditions })
            .populate([{ path: 'organizationId', select: 'name' }, { path: 'roleId', select: 'name' }]);

          if (user && !user.firebaseUid && authPayload.providerUserId) {
            user.firebaseUid = authPayload.providerUserId;
            await user.save();
          }
        }
        if (!user) {
          throw saveErr;
        }
      }
    }

    const org = (user.organizationId as Types.ObjectId | IOrganization) as IOrganization;
    const role = (user.roleId as Types.ObjectId | IRole) as IRole;

    const permissions = await getUserPermissions((role._id as Types.ObjectId).toString());
    const isSuperAdmin = role.isSuperAdmin || false;
    const isSectionRep = !!(await Section.findOne({ representativeId: user._id }));

    return {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      organizationId: (org._id as Types.ObjectId).toString(),
      organizationName: org.name || 'University',
      roleId: (role._id as Types.ObjectId).toString(),
      roleName: role.name || 'STUDENT',
      permissions,
      isSuperAdmin,
      isSectionRep,
    };
  }
}
