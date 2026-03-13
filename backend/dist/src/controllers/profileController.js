"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileController = exports.updateProfileController = void 0;
const models_1 = require("../models");
const response_1 = require("../utils/response");
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('profileController');
/**
 * Update user profile
 * PUT /api/profile
 */
const updateProfileController = async (req, res) => {
    try {
        if (!req.user) {
            return (0, response_1.sendError)(res, 401, 'Authentication required');
        }
        const { name, githubUsername } = req.body;
        // Find user by the same method as the GitHub controller - by Firebase UID
        // First, we need to get the Firebase UID from the JWT token or request
        // Since this uses authenticateUser middleware, we have req.user from JWT
        // But we need to get the Firebase UID to match with GitHub controller
        // Look up the user by the ID from the JWT to get their Firebase UID
        logger.info(`Attempting to find user by ID: ${req.user.userId} for profile update`);
        const user = await models_1.User.findById(req.user.userId);
        logger.info(`Found user for profile update: ${user ? user.name : 'NOT FOUND'}, current GitHub username: ${user ? user.githubUsername : 'N/A'}`);
        if (!user) {
            return (0, response_1.sendError)(res, 404, 'User not found');
        }
        // Update allowed fields
        if (name) {
            user.name = name;
        }
        if (githubUsername !== undefined) {
            user.githubUsername = githubUsername;
        }
        await user.save();
        logger.info(`User profile updated for ${user.email}`, { userId: user._id, updatedFields: { name, githubUsername } });
        return (0, response_1.sendResponse)(res, 200, {
            id: user._id,
            name: user.name,
            email: user.email,
            githubUsername: user.githubUsername,
        }, 'Profile updated successfully');
    }
    catch (error) {
        logger.error('Error updating profile:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to update profile');
    }
};
exports.updateProfileController = updateProfileController;
/**
 * Get current user profile
 * GET /api/profile
 */
const getProfileController = async (req, res) => {
    try {
        if (!req.user) {
            return (0, response_1.sendError)(res, 401, 'Authentication required');
        }
        const user = await models_1.User.findById(req.user.userId);
        if (!user) {
            return (0, response_1.sendError)(res, 404, 'User not found');
        }
        return (0, response_1.sendResponse)(res, 200, {
            id: user._id,
            name: user.name,
            email: user.email,
            githubUsername: user.githubUsername,
            role: user.roleId?.name || 'USER',
        }, 'Profile retrieved successfully');
    }
    catch (error) {
        logger.error('Error retrieving profile:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to retrieve profile');
    }
};
exports.getProfileController = getProfileController;
