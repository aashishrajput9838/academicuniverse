"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshProjectStats = exports.getProjectStats = void 0;
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const models_1 = require("../models");
const githubService_1 = __importDefault(require("../services/githubService"));
const logger = new logger_1.Logger('githubController');
/**
 * Controller: Get student's GitHub project statistics
 * @route GET /api/github/projects
 * @access Private (Student role only)
 */
const getProjectStats = async (req, res) => {
    let userRecord; // Declare outside try block for error logging
    try {
        // Verify Firebase authentication
        if (!req.firebaseUser) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'No valid Firebase token provided'
            });
        }
        const { firebaseUid, email } = req.firebaseUser;
        logger.info(`Fetching project stats for user: ${email} (Firebase UID: ${firebaseUid})`);
        // Fetch user from database
        const user = await models_1.User.findOne({ firebaseUid }).populate('roleId');
        userRecord = user; // Assign to outer variable for error logging
        logger.info(`Attempting to find user by Firebase UID: ${firebaseUid}`);
        logger.info(`Found user: ${user ? user.name : 'NOT FOUND'}, GitHub username: ${user ? user.githubUsername : 'N/A'}`);
        if (!user) {
            logger.warn(`User not found in database for Firebase UID: ${firebaseUid}`);
            return res.status(404).json({
                success: false,
                message: 'User profile not found',
                error: 'Please complete your profile setup'
            });
        }
        // Check if user has student role
        const userRole = user.roleId;
        if (userRole.name !== 'STUDENT') {
            logger.warn(`Non-student user attempted to access GitHub projects: ${email}`);
            return res.status(403).json({
                success: false,
                message: 'Access denied',
                error: 'This feature is only available for students'
            });
        }
        // Check if GitHub username is set
        if (!user.githubUsername) {
            logger.info(`User ${email} has no GitHub username configured`);
            return res.status(400).json({
                success: false,
                message: 'GitHub username not configured',
                error: 'Please set your GitHub username in your profile settings',
                code: 'GITHUB_USERNAME_MISSING'
            });
        }
        // Check if service is rate limited
        if (githubService_1.default.isRateLimited()) {
            logger.warn(`GitHub service is currently rate limited for user: ${email}`);
            return res.status(429).json({
                success: false,
                message: 'Service temporarily unavailable',
                error: 'GitHub API rate limit exceeded. Please try again later.',
                retryAfter: '30 minutes'
            });
        }
        // Fetch project statistics from GitHub
        const stats = await githubService_1.default.getProjectStats(user.githubUsername);
        logger.info(`Successfully fetched project stats for user ${email}:`, stats);
        return res.status(200).json({
            success: true,
            message: 'Project statistics retrieved successfully',
            data: {
                totalProjects: stats.total,
                projectsCompleted: stats.completed,
                projectsOngoing: stats.ongoing,
                githubUsername: user.githubUsername,
                lastUpdated: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger.error('Error fetching GitHub project statistics:', error);
        logger.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            userId: userRecord?._id,
            githubUsername: userRecord?.githubUsername
        });
        // Handle specific error types
        if (error instanceof errors_1.ExternalAPIError) {
            return res.status(502).json({
                success: false,
                message: 'External service error',
                error: error.message,
                code: 'GITHUB_API_ERROR'
            });
        }
        if (error instanceof errors_1.NotFoundError) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found',
                error: error.message
            });
        }
        // Handle generic errors with more detail in development
        const isDev = process.env.NODE_ENV === 'development';
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: isDev ? error.message : 'Failed to fetch project statistics',
            code: 'INTERNAL_ERROR',
            ...(isDev && { stack: error.stack })
        });
    }
};
exports.getProjectStats = getProjectStats;
/**
 * Controller: Refresh cached GitHub data
 * @route POST /api/github/projects/refresh
 * @access Private (Student role only)
 */
const refreshProjectStats = async (req, res) => {
    try {
        // Verify Firebase authentication
        if (!req.firebaseUser) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const { firebaseUid, email } = req.firebaseUser;
        logger.info(`Refreshing project stats cache for user: ${email}`);
        // Fetch user from database
        const user = await models_1.User.findOne({ firebaseUid }).populate('roleId');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Check if user has student role
        const userRole = user.roleId;
        if (userRole.name !== 'STUDENT') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        // Check if GitHub username is set
        if (!user.githubUsername) {
            return res.status(400).json({
                success: false,
                message: 'GitHub username not configured'
            });
        }
        // Clear cache and fetch fresh data
        githubService_1.default.clearUserCache(user.githubUsername);
        const stats = await githubService_1.default.getProjectStats(user.githubUsername);
        logger.info(`Successfully refreshed project stats for user ${email}`);
        return res.status(200).json({
            success: true,
            message: 'Project statistics refreshed successfully',
            data: {
                totalProjects: stats.total,
                projectsCompleted: stats.completed,
                projectsOngoing: stats.ongoing,
                githubUsername: user.githubUsername,
                lastUpdated: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger.error('Error refreshing GitHub project statistics:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to refresh project statistics',
            error: error.message
        });
    }
};
exports.refreshProjectStats = refreshProjectStats;
