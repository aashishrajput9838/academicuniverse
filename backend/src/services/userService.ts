import User from '../models/User';
import { IOrganization } from '../models/Organization';
import { IRole } from '../models/Role';
import Section from '../models/Section';
import { getUserPermissions } from './authService';
import { AuthPayload } from '../auth/provider';
import { Types } from 'mongoose';

/**
 * Canonical user data transferred out of the service layer.
 * All fields are primitives – no Mongoose documents or "any" casts.
 */
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

/**
 * Service responsible for fetching or creating a canonical user based on the AuthPayload.
 * It ensures that organization and role are populated and returns a fully typed DTO.
 */
export class UserService {
  /**
   * Find an existing user linked to the AuthPayload or create a new one.
   * Returns a typed DTO without any `any` casts.
   */
  static async findOrCreateCanonicalUser(authPayload: AuthPayload): Promise<CanonicalUserDTO> {
    // Attempt to find user by email (unique index assumed).
    let user = await User.findOne({ email: authPayload.email })
      .populate([{ path: 'organizationId', select: 'name' }, { path: 'roleId', select: 'name' }]);

    if (!user) {
      // Minimal user creation – other fields (org/role) can be set later.
      user = new User({
        name: authPayload.email.split('@')[0],
        email: authPayload.email,
      });
      await user.save();
      // Populate after save to get actual documents.
      await user.populate([{ path: 'organizationId', select: 'name' }, { path: 'roleId', select: 'name' }]);
    }

    // At this point organizationId and roleId are populated documents.
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
      organizationName: org.name,
      roleId: (role._id as Types.ObjectId).toString(),
      roleName: role.name,
      permissions,
      isSuperAdmin,
      isSectionRep,
    };
  }
}
