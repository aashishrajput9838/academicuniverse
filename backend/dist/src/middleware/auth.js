"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateFirebaseUser = exports.enforceOrgIsolation = exports.authorize = exports.authenticateUser = void 0;
const jwt_1 = require("../utils/jwt");
const errors_1 = require("../utils/errors");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
/**
 * Middleware: Verify JWT token and attach user to request
 * This must be called on all protected routes
 */
const authenticateUser = (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            throw new errors_1.AuthenticationError('No token provided. Please log in.');
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        // Attach user data to request object
        req.user = decoded;
        req.organizationId = decoded.organizationId;
        next();
    }
    catch (error) {
        if (error instanceof errors_1.AuthenticationError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid token or authentication failed',
            error: error.message,
        });
    }
};
exports.authenticateUser = authenticateUser;
/**
 * Middleware: Check if user has specific permission
 * Usage: router.post('/marks', authorize('ADD_MARKS'), controller)
 */
const authorize = (...requiredPermissions) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            // Super admins have all permissions
            if (req.user.isSuperAdmin) {
                return next();
            }
            // Check if user has at least one of the required permissions
            const hasPermission = requiredPermissions.some(permission => req.user?.permissions.includes(permission));
            if (!hasPermission) {
                throw new errors_1.AuthorizationError(`User does not have permission(s): ${requiredPermissions.join(', ')}`);
            }
            next();
        }
        catch (error) {
            if (error instanceof errors_1.AuthorizationError) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            return res.status(403).json({
                success: false,
                message: 'Authorization failed',
                error: error.message,
            });
        }
    };
};
exports.authorize = authorize;
/**
 * Middleware: Enforce organization isolation
 * Automatically filters queries by organizationId
 */
const enforceOrgIsolation = (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AuthenticationError('User not authenticated');
        }
        // Ensure organizationId is set in request
        req.organizationId = req.user.organizationId;
        // If request contains orgId in body/params, validate it matches user's org
        const incomingOrgId = req.body?.organizationId || req.params?.organizationId;
        if (incomingOrgId && incomingOrgId !== req.user.organizationId) {
            throw new errors_1.AuthorizationError('Cannot access data from other organizations');
        }
        next();
    }
    catch (error) {
        if (error instanceof errors_1.AuthorizationError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(403).json({
            success: false,
            message: 'Organization isolation check failed',
        });
    }
};
exports.enforceOrgIsolation = enforceOrgIsolation;
/**
 * Extract Bearer token from Authorization header
 */
const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return null;
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    return parts[1];
};
/**
 * Middleware: Verify Firebase ID token and attach user to request
 * This is specifically for Firebase-authenticated users
 */
const authenticateFirebaseUser = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            throw new errors_1.AuthenticationError('No Firebase token provided. Please log in.');
        }
        // Verify Firebase ID token
        const decoded = await firebaseAdmin_1.firebaseAuth.verifyIdToken(token);
        // Extract user information from Firebase token
        const { uid, email } = decoded;
        // Attach user data to request object
        req.firebaseUser = {
            firebaseUid: uid,
            email,
            // Additional Firebase claims if any
            ...decoded
        };
        // We still need to verify if this user exists in our database
        // This would typically involve looking up the user by firebaseUid
        // For now, we'll just attach the Firebase user info
        // In a real implementation, you'd probably want to check if the user exists in your MongoDB
        next();
    }
    catch (error) {
        if (error instanceof errors_1.AuthenticationError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid Firebase token or authentication failed',
            error: error.message,
        });
    }
};
exports.authenticateFirebaseUser = authenticateFirebaseUser;
