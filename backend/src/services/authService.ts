import { User, Role, RolePermission, Permission, Organization } from '../models';
import { generateToken, JWTPayload } from '../utils/jwt';
import { AuthenticationError, NotFoundError, ValidationError } from '../utils/errors';
import { firebaseAuth } from '../config/firebaseAdmin';
import { detectRoleFromEmail } from './roleDetectionService';
import admin from 'firebase-admin';

/**
 * Fetch user permissions based on role
 */
export const getUserPermissions = async (roleId: string): Promise<string[]> => {
  try {
    const rolePermissions = await RolePermission.find({ roleId })
      .populate('permissionId', 'name')
      .lean();

    if (!rolePermissions || rolePermissions.length === 0) {
      return [];
    }

    const permissions = rolePermissions
      .map(rp => (rp.permissionId as any)?.name)
      .filter(Boolean) as string[];

    return permissions;
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return [];
  }
};

/**
 * Login user with email and password
 * Returns JWT token with user data and permissions
 */
export const loginWithEmail = async (email: string, password: string): Promise<{ token: string; user: any }> => {
  try {
    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user and include password field
    const user = await User.findOne({ email })
      .select('+password')
      .populate(['organizationId', 'roleId']);

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('User account is deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Normalize roleId (handle populated roleId or raw ObjectId)
    const normalizedRoleId = (user.roleId && (user.roleId as any)._id)
      ? (user.roleId as any)._id.toString()
      : user.roleId.toString();

    // Fetch user permissions
    const permissions = await getUserPermissions(normalizedRoleId);

    // Check if role is super admin
    const role = await Role.findById(normalizedRoleId);
    const isSuperAdmin = role?.isSuperAdmin || false;

    // Create JWT payload
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      organizationId: (user.organizationId as any)._id.toString(),
      roleId: normalizedRoleId,
      permissions,
      isSuperAdmin,
      name: user.name,
    };

    const token = generateToken(payload);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Check if user is a section representative
    const { default: Section } = await import('../models/Section');
    const isSectionRep = !!(await Section.findOne({ representativeId: user._id }));

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: (user.organizationId as any).name,
        organizationId: (user.organizationId as any)._id.toString(),
        role: (user.roleId as any).name,
        permissions,
        isSectionRep // Add this flag
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Login user with Firebase UID (OAuth)
 * Returns JWT token with user data and permissions
 * NOTE: This function now verifies the Firebase token and assigns roles based on email domain
 */
export const loginWithFirebase = async (idToken: string): Promise<{ token: string; user: any }> => {
  try {
    if (!idToken) {
      throw new ValidationError('Firebase ID token is required');
    }

    // Verify the Firebase ID token to get user information
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await firebaseAuth.verifyIdToken(idToken);
    } catch (error: any) {
      if (error.message.includes('Firebase Admin SDK not initialized')) {
        // In development, we can simulate a valid token for testing
        // In a real scenario, you'd want to properly configure Firebase Admin
        console.warn('Firebase Admin not initialized, using mock token validation for development');

        // For development purposes, we'll create a mock decoded token
        // In a real app, this should never happen in production
        decodedToken = {
          uid: 'mock-uid-' + Math.random().toString(36).substr(2, 9),
          email: 'test@example.com', // This would need to be passed differently in real app
        } as admin.auth.DecodedIdToken;
      } else {
        throw new AuthenticationError(`Failed to verify Firebase token: ${error.message}`);
      }
    }

    const { uid: firebaseUid, email } = decodedToken;

    if (!email) {
      throw new AuthenticationError('Email not found in Firebase token');
    }

    // Use role detection service to determine role based on email domain
    const roleInfo = detectRoleFromEmail(email);

    // Find the actual organization in the database
    const organization = await Organization.findOne({ slug: 'sharda-university' });
    if (!organization) {
      throw new NotFoundError('Default organization not found. Please run the seed script to initialize the database.');
    }

    // Find or create user in our database
    let user = await User.findOne({ firebaseUid }).populate(['organizationId', 'roleId']);

    if (user) {
      // User exists with this firebaseUid, update if necessary
      if (user.email !== email) {
        user.email = email;
      }
      await user.save();
    } else {
      // User doesn't exist with this firebaseUid, check if user exists with this email but no firebaseUid
      user = await User.findOne({ email }).populate(['organizationId', 'roleId']);

      if (user) {
        // User exists with this email but no firebaseUid, so link the firebaseUid
        user.firebaseUid = firebaseUid;
        await user.save();
      } else {
        // User doesn't exist at all, create new user based on role detection
        // Find or create the appropriate role based on detected role
        let role = await Role.findOne({
          name: roleInfo.role,
          organizationId: organization._id
        });

        if (!role) {
          // If role doesn't exist, create it (or use default role mapping)
          // For now, we'll try to find a matching role in the system
          const roleNameMap: { [key: string]: string } = {
            'STUDENT': 'STUDENT',
            'FACULTY': 'FACULTY'
          };

          const mappedRoleName = roleNameMap[roleInfo.role] || 'STUDENT';
          role = await Role.findOne({
            name: mappedRoleName,
            organizationId: organization._id
          });

          if (!role) {
            // Fallback: use the first role that matches the type
            role = await Role.findOne({ name: mappedRoleName });
          }
        }

        if (!role) {
          throw new NotFoundError(`Role not found for detected role: ${roleInfo.role}`);
        }

        // Create new user
        user = new User({
          name: email.split('@')[0], // Use part of email as name initially
          email,
          firebaseUid,
          organizationId: organization._id, // Use actual ObjectId from database
          roleId: role._id,
        });

        await user.save();
        user = await User.findById(user._id).populate(['organizationId', 'roleId']);
      }
    }

    if (!user || !user.isActive) {
      throw new AuthenticationError('User account is deactivated');
    }

    // Override permissions based on detected role instead of DB role
    // This ensures the role is always determined by the email domain
    const permissions = roleInfo.permissions;

    // Check if role is super admin
    const dbRole = await Role.findById(user.roleId);
    const isSuperAdmin = dbRole?.isSuperAdmin || false;

    // Normalize roleId (handle populated roleId or raw ObjectId)
    const normalizedRoleId = (user.roleId && (user.roleId as any)._id)
      ? (user.roleId as any)._id.toString()
      : user.roleId.toString();

    // Create JWT payload with detected role information
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      firebaseUid: user.firebaseUid,
      organizationId: organization._id.toString(),
      roleId: normalizedRoleId,
      permissions,
      isSuperAdmin,
      name: user.name,
    };

    const token = generateToken(payload);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Check if user is a section representative
    const { default: Section } = await import('../models/Section');
    const isSectionRep = !!(await Section.findOne({ representativeId: user._id }));

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: organization._id.toString(), // Use actual ObjectId from database
        organizationId: organization._id.toString(),
        role: roleInfo.role, // Use detected role
        permissions,
        isSectionRep // Add this flag
      },
    };
  } catch (error) {
    throw error;
  }
};
/**
 * Register new user (typically by organization admin or platform)
 */
export const registerUser = async (
  name: string,
  email: string,
  password: string,
  organizationId: string,
  roleId: string
): Promise<any> => {
  try {
    // Validate inputs
    if (!name || !email) {
      throw new ValidationError('Name and email are required');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ValidationError('Email already in use');
    }

    // If org/role missing, try to auto-detect (like Firebase login does)
    let finalOrgId = organizationId;
    let finalRoleId = roleId;

    if (!finalOrgId || !finalRoleId) {
      const { detectRoleFromEmail } = await import('./roleDetectionService');
      const roleInfo = detectRoleFromEmail(email);
      const organization = await Organization.findOne({ slug: 'sharda-university' });
      if (!organization) throw new NotFoundError('Default organization not found.');
      finalOrgId = finalOrgId || organization._id.toString();

      let role = await Role.findOne({ name: roleInfo.role, organizationId: finalOrgId });
      if (!role) {
        const mappedRoleName = roleInfo.role === 'FACULTY' ? 'FACULTY' : 'STUDENT';
        role = await Role.findOne({ name: mappedRoleName });
      }
      if (!role) throw new NotFoundError('Role not found.');
      finalRoleId = finalRoleId || role._id.toString();
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      organizationId: finalOrgId,
      roleId: finalRoleId,
    });

    await user.save();

    return {
      id: user._id,
      name: user.name,
      email: user.email,
    };
  } catch (error) {
    throw error;
  }
};
