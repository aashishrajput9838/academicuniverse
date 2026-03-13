"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = exports.loginWithFirebase = exports.loginWithEmail = exports.getUserPermissions = void 0;
const models_1 = require("../models");
const jwt_1 = require("../utils/jwt");
const errors_1 = require("../utils/errors");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const roleDetectionService_1 = require("./roleDetectionService");
/**
 * Fetch user permissions based on role
 */
const getUserPermissions = async (roleId) => {
    try {
        const rolePermissions = await models_1.RolePermission.find({ roleId })
            .populate('permissionId', 'name')
            .lean();
        if (!rolePermissions || rolePermissions.length === 0) {
            return [];
        }
        const permissions = rolePermissions
            .map(rp => rp.permissionId?.name)
            .filter(Boolean);
        return permissions;
    }
    catch (error) {
        console.error('Error fetching permissions:', error);
        return [];
    }
};
exports.getUserPermissions = getUserPermissions;
/**
 * Login user with email and password
 * Returns JWT token with user data and permissions
 */
const loginWithEmail = async (email, password) => {
    try {
        // Validate input
        if (!email || !password) {
            throw new errors_1.ValidationError('Email and password are required');
        }
        // Find user and include password field
        const user = await models_1.User.findOne({ email })
            .select('+password')
            .populate(['organizationId', 'roleId']);
        if (!user) {
            throw new errors_1.AuthenticationError('Invalid email or password');
        }
        if (!user.isActive) {
            throw new errors_1.AuthenticationError('User account is deactivated');
        }
        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new errors_1.AuthenticationError('Invalid email or password');
        }
        // Normalize roleId (handle populated roleId or raw ObjectId)
        const normalizedRoleId = (user.roleId && user.roleId._id)
            ? user.roleId._id.toString()
            : user.roleId.toString();
        // Fetch user permissions
        const permissions = await (0, exports.getUserPermissions)(normalizedRoleId);
        // Check if role is super admin
        const role = await models_1.Role.findById(normalizedRoleId);
        const isSuperAdmin = role?.isSuperAdmin || false;
        // Create JWT payload
        const payload = {
            userId: user._id.toString(),
            email: user.email,
            organizationId: user.organizationId._id.toString(),
            roleId: normalizedRoleId,
            permissions,
            isSuperAdmin,
        };
        const token = (0, jwt_1.generateToken)(payload);
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        return {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                organization: user.organizationId.name,
                role: user.roleId.name,
                permissions,
            },
        };
    }
    catch (error) {
        throw error;
    }
};
exports.loginWithEmail = loginWithEmail;
/**
 * Login user with Firebase UID (OAuth)
 * Returns JWT token with user data and permissions
 * NOTE: This function now verifies the Firebase token and assigns roles based on email domain
 */
const loginWithFirebase = async (idToken) => {
    try {
        if (!idToken) {
            throw new errors_1.ValidationError('Firebase ID token is required');
        }
        // Verify the Firebase ID token to get user information
        let decodedToken;
        try {
            decodedToken = await firebaseAdmin_1.firebaseAuth.verifyIdToken(idToken);
        }
        catch (error) {
            if (error.message.includes('Firebase Admin SDK not initialized')) {
                // In development, we can simulate a valid token for testing
                // In a real scenario, you'd want to properly configure Firebase Admin
                console.warn('Firebase Admin not initialized, using mock token validation for development');
                // For development purposes, we'll create a mock decoded token
                // In a real app, this should never happen in production
                decodedToken = {
                    uid: 'mock-uid-' + Math.random().toString(36).substr(2, 9),
                    email: 'test@example.com', // This would need to be passed differently in real app
                };
            }
            else {
                throw new errors_1.AuthenticationError(`Failed to verify Firebase token: ${error.message}`);
            }
        }
        const { uid: firebaseUid, email } = decodedToken;
        if (!email) {
            throw new errors_1.AuthenticationError('Email not found in Firebase token');
        }
        // Use role detection service to determine role based on email domain
        const roleInfo = (0, roleDetectionService_1.detectRoleFromEmail)(email);
        // Find the actual organization in the database
        const organization = await models_1.Organization.findOne({ slug: 'sharda-university' });
        if (!organization) {
            throw new errors_1.NotFoundError('Default organization not found. Please run the seed script to initialize the database.');
        }
        // Find or create user in our database
        let user = await models_1.User.findOne({ firebaseUid }).populate(['organizationId', 'roleId']);
        if (user) {
            // User exists with this firebaseUid, update if necessary
            if (user.email !== email) {
                user.email = email;
            }
            await user.save();
        }
        else {
            // User doesn't exist with this firebaseUid, check if user exists with this email but no firebaseUid
            user = await models_1.User.findOne({ email }).populate(['organizationId', 'roleId']);
            if (user) {
                // User exists with this email but no firebaseUid, so link the firebaseUid
                user.firebaseUid = firebaseUid;
                await user.save();
            }
            else {
                // User doesn't exist at all, create new user based on role detection
                // Find or create the appropriate role based on detected role
                let role = await models_1.Role.findOne({
                    name: roleInfo.role,
                    organizationId: organization._id
                });
                if (!role) {
                    // If role doesn't exist, create it (or use default role mapping)
                    // For now, we'll try to find a matching role in the system
                    const roleNameMap = {
                        'STUDENT': 'STUDENT',
                        'FACULTY': 'FACULTY'
                    };
                    const mappedRoleName = roleNameMap[roleInfo.role] || 'STUDENT';
                    role = await models_1.Role.findOne({
                        name: mappedRoleName,
                        organizationId: organization._id
                    });
                    if (!role) {
                        // Fallback: use the first role that matches the type
                        role = await models_1.Role.findOne({ name: mappedRoleName });
                    }
                }
                if (!role) {
                    throw new errors_1.NotFoundError(`Role not found for detected role: ${roleInfo.role}`);
                }
                // Create new user
                user = new models_1.User({
                    name: email.split('@')[0], // Use part of email as name initially
                    email,
                    firebaseUid,
                    organizationId: organization._id, // Use actual ObjectId from database
                    roleId: role._id,
                });
                await user.save();
                user = await models_1.User.findById(user._id).populate(['organizationId', 'roleId']);
            }
        }
        if (!user || !user.isActive) {
            throw new errors_1.AuthenticationError('User account is deactivated');
        }
        // Override permissions based on detected role instead of DB role
        // This ensures the role is always determined by the email domain
        const permissions = roleInfo.permissions;
        // Check if role is super admin
        const dbRole = await models_1.Role.findById(user.roleId);
        const isSuperAdmin = dbRole?.isSuperAdmin || false;
        // Create JWT payload with detected role information
        const payload = {
            userId: user._id.toString(),
            email: user.email,
            organizationId: organization._id.toString(), // Use actual ObjectId from database
            roleId: user.roleId.toString(), // Keep the DB role for compatibility
            permissions, // Use permissions from role detection
            isSuperAdmin,
        };
        const token = (0, jwt_1.generateToken)(payload);
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        return {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                organization: organization._id.toString(), // Use actual ObjectId from database
                role: roleInfo.role, // Use detected role
                permissions,
            },
        };
    }
    catch (error) {
        throw error;
    }
};
exports.loginWithFirebase = loginWithFirebase;
/**
 * Register new user (typically by organization admin or platform)
 */
const registerUser = async (name, email, password, organizationId, roleId) => {
    try {
        // Validate inputs
        if (!name || !email || !organizationId || !roleId) {
            throw new errors_1.ValidationError('Name, email, organization, and role are required');
        }
        // Check if user already exists
        const existingUser = await models_1.User.findOne({ email });
        if (existingUser) {
            throw new errors_1.ValidationError('Email already in use');
        }
        // Create user
        const user = new models_1.User({
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
    }
    catch (error) {
        throw error;
    }
};
exports.registerUser = registerUser;
