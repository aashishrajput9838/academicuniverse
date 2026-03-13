"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeController = exports.registerController = exports.firebaseLoginController = exports.loginController = void 0;
const authService_1 = require("../services/authService");
const response_1 = require("../utils/response");
/**
 * Login with email and password
 * POST /api/auth/login
 */
const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return (0, response_1.sendError)(res, 400, 'Email and password are required');
        }
        const result = await (0, authService_1.loginWithEmail)(email, password);
        return (0, response_1.sendResponse)(res, 200, result, 'Login successful');
    }
    catch (error) {
        console.error('Login error:', error);
        return (0, response_1.sendError)(res, error.statusCode || 401, error.message);
    }
};
exports.loginController = loginController;
/**
 * Login/Register with Firebase OAuth
 * POST /api/auth/firebase-login
 */
const firebaseLoginController = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return (0, response_1.sendError)(res, 400, 'Firebase ID token is required');
        }
        const result = await (0, authService_1.loginWithFirebase)(idToken);
        return (0, response_1.sendResponse)(res, 200, result, 'Firebase login successful');
    }
    catch (error) {
        console.error('Firebase login error:', error);
        return (0, response_1.sendError)(res, error.statusCode || 401, error.message);
    }
};
exports.firebaseLoginController = firebaseLoginController;
/**
 * Register new user
 * POST /api/auth/register
 */
const registerController = async (req, res) => {
    try {
        const { name, email, password, organizationId, roleId } = req.body;
        const user = await (0, authService_1.registerUser)(name, email, password, organizationId, roleId);
        return (0, response_1.sendResponse)(res, 201, user, 'User registered successfully');
    }
    catch (error) {
        console.error('Registration error:', error);
        return (0, response_1.sendError)(res, error.statusCode || 400, error.message);
    }
};
exports.registerController = registerController;
/**
 * Get current user info
 * GET /api/auth/me
 */
const getMeController = async (req, res) => {
    try {
        if (!req.user) {
            return (0, response_1.sendError)(res, 401, 'Not authenticated');
        }
        // Import models inside the function to avoid circular dependencies
        const { default: User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
        const { default: Role } = await Promise.resolve().then(() => __importStar(require('../models/Role')));
        const { default: Organization } = await Promise.resolve().then(() => __importStar(require('../models/Organization')));
        // Get the user from the database to get full details
        const user = await User.findById(req.user.userId)
            .populate('roleId')
            .populate('organizationId')
            .select('-password'); // Don't return password
        if (!user) {
            return (0, response_1.sendError)(res, 404, 'User not found');
        }
        // Format the response to match frontend expectations
        const userData = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            organization: user.organizationId.name,
            role: user.roleId.name,
            permissions: req.user.permissions,
            isSuperAdmin: req.user.isSuperAdmin
        };
        return (0, response_1.sendResponse)(res, 200, userData, 'User data retrieved');
    }
    catch (error) {
        console.error('Get user error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to fetch user data');
    }
};
exports.getMeController = getMeController;
