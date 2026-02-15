import { User, Role, RolePermission, Permission } from '../models';
import { generateToken, JWTPayload } from '../utils/jwt';
import { AuthenticationError, NotFoundError, ValidationError } from '../utils/errors';

/**
 * Fetch user permissions based on role
 */
export const getUserPermissions = async (roleId: string): Promise<string[]> => {
  try {
    const rolePermissions = await RolePermission.find({ roleId })
      .populate('permissionId', 'name')
      .lean();

    return rolePermissions.map(rp => (rp.permissionId as any).name);
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

    // Fetch user permissions
    const permissions = await getUserPermissions(user.roleId.toString());

    // Check if role is super admin
    const role = await Role.findById(user.roleId);
    const isSuperAdmin = role?.isSuperAdmin || false;

    // Create JWT payload
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      organizationId: user.organizationId._id.toString(),
      roleId: user.roleId._id.toString(),
      permissions,
      isSuperAdmin,
    };

    const token = generateToken(payload);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: (user.organizationId as any).name,
        role: (user.roleId as any).name,
        permissions,
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Login user with Firebase UID (OAuth)
 * Returns JWT token with user data and permissions
 */
export const loginWithFirebase = async (firebaseUid: string): Promise<{ token: string; user: any }> => {
  try {
    if (!firebaseUid) {
      throw new ValidationError('Firebase UID is required');
    }

    const user = await User.findOne({ firebaseUid })
      .populate(['organizationId', 'roleId']);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.isActive) {
      throw new AuthenticationError('User account is deactivated');
    }

    // Fetch user permissions
    const permissions = await getUserPermissions(user.roleId.toString());

    // Check if role is super admin
    const role = await Role.findById(user.roleId);
    const isSuperAdmin = role?.isSuperAdmin || false;

    // Create JWT payload
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      organizationId: user.organizationId._id.toString(),
      roleId: user.roleId._id.toString(),
      permissions,
      isSuperAdmin,
    };

    const token = generateToken(payload);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: (user.organizationId as any).name,
        role: (user.roleId as any).name,
        permissions,
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
    if (!name || !email || !organizationId || !roleId) {
      throw new ValidationError('Name, email, organization, and role are required');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ValidationError('Email already in use');
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      organizationId,
      roleId,
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
