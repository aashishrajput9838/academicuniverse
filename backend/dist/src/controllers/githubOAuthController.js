"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeveloperStats = exports.disconnectGithub = exports.githubOAuthCallback = exports.connectGithub = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../utils/logger");
const githubOAuthService_1 = __importDefault(require("../services/githubOAuthService"));
const analyticsService_1 = __importDefault(require("../services/analyticsService"));
const response_1 = require("../utils/response");
const logger = new logger_1.Logger('githubOAuthController');
/**
 * Initiates the GitHub OAuth flow
 * GET /api/github/connect
 */
const connectGithub = async (req, res) => {
    try {
        if (!req.firebaseUser) {
            return (0, response_1.sendError)(res, 401, 'Authentication required');
        }
        // Generate a random state parameter for CSRF protection
        const state = crypto_1.default.randomBytes(32).toString('hex');
        // Store the Firebase UID in session for verification after callback
        req.session = req.session || {};
        req.session.github_oauth_state = state;
        req.session.firebase_uid = req.firebaseUser.firebaseUid;
        // Get the GitHub authorization URL
        const authUrl = githubOAuthService_1.default.getAuthorizationUrl(state);
        logger.info(`GitHub OAuth initiated for user: ${req.firebaseUser.email}`);
        return res.redirect(authUrl);
    }
    catch (error) {
        logger.error('Error initiating GitHub OAuth:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to initiate GitHub OAuth');
    }
};
exports.connectGithub = connectGithub;
/**
 * Handles the GitHub OAuth callback
 * GET /api/github/callback
 */
const githubOAuthCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code || typeof code !== 'string') {
            return (0, response_1.sendError)(res, 400, 'Authorization code is required');
        }
        if (!state || typeof state !== 'string') {
            return (0, response_1.sendError)(res, 400, 'State parameter is required for CSRF protection');
        }
        // Verify the state parameter to prevent CSRF attacks
        req.session = req.session || {};
        if (state !== req.session.github_oauth_state) {
            return (0, response_1.sendError)(res, 400, 'Invalid state parameter');
        }
        // Get the Firebase UID from session
        const firebaseUid = req.session.firebase_uid;
        if (!firebaseUid) {
            return (0, response_1.sendError)(res, 400, 'Session expired or invalid');
        }
        // Exchange the authorization code for an access token
        const accessToken = await githubOAuthService_1.default.exchangeCodeForToken(code, state);
        // Store the access token in the user's profile
        await githubOAuthService_1.default.storeAccessToken(firebaseUid, accessToken);
        // Clear the session data
        delete req.session.github_oauth_state;
        delete req.session.firebase_uid;
        // For now, return a message to indicate success
        // In practice, you'd need to redirect back to your frontend
        // with the necessary parameters to complete the flow
        res.send(`
      <html>
        <head><title>GitHub Connected</title></head>
        <body>
          <h1>GitHub Account Connected Successfully!</h1>
          <p>You can now close this window and return to the application.</p>
          <script>
            // Send a message to parent window if this is in a popup
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'GITHUB_CONNECTED',
                message: 'GitHub account connected successfully!'
              }, '*');
              window.close();
            }
            // Or redirect to main app if not in popup
            setTimeout(() => {
              window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:3000'}';
            }, 3000);
          </script>
        </body>
      </html>
    `);
    }
    catch (error) {
        logger.error('Error in GitHub OAuth callback:', error);
        // Clear the session data on error
        if (req.session) {
            delete req.session.github_oauth_state;
            delete req.session.firebase_uid;
        }
        res.send(`
      <html>
        <head><title>GitHub Connection Error</title></head>
        <body>
          <h1>Error Connecting GitHub Account</h1>
          <p>${error.message}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'GITHUB_CONNECT_ERROR', 
                error: '${error.message.replace(/'/g, "\\'")}' 
              }, '*');
              window.close();
            }
            // Or redirect to main app if not in popup
            setTimeout(() => {
              window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=${encodeURIComponent(error.message)}';
            }, 3000);
          </script>
        </body>
      </html>
    `);
    }
};
exports.githubOAuthCallback = githubOAuthCallback;
/**
 * Disconnects the GitHub account
 * DELETE /api/github/disconnect
 */
const disconnectGithub = async (req, res) => {
    try {
        if (!req.firebaseUser) {
            return (0, response_1.sendError)(res, 401, 'Authentication required');
        }
        // Remove the GitHub access token from the user's profile
        await githubOAuthService_1.default.removeAccessToken(req.firebaseUser.firebaseUid);
        logger.info(`GitHub account disconnected for user: ${req.firebaseUser.email}`);
        return (0, response_1.sendResponse)(res, 200, null, 'GitHub account disconnected successfully');
    }
    catch (error) {
        logger.error('Error disconnecting GitHub account:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to disconnect GitHub account');
    }
};
exports.disconnectGithub = disconnectGithub;
/**
 * Gets processed developer statistics
 * GET /api/github/stats
 */
const getDeveloperStats = async (req, res) => {
    try {
        if (!req.firebaseUser) {
            return (0, response_1.sendError)(res, 401, 'Authentication required');
        }
        // Process and return developer statistics
        const stats = await analyticsService_1.default.processDeveloperAnalytics(req.firebaseUser.firebaseUid);
        logger.info(`Developer stats retrieved for user: ${req.firebaseUser.email}`);
        return (0, response_1.sendResponse)(res, 200, stats, 'Developer statistics retrieved successfully');
    }
    catch (error) {
        logger.error('Error retrieving developer stats:', error);
        // Handle specific error cases
        if (error.message.includes('GitHub access token')) {
            // User hasn't connected GitHub OAuth - this is not an error, just not available
            return (0, response_1.sendResponse)(res, 200, null, 'GitHub OAuth not connected');
        }
        return (0, response_1.sendError)(res, 500, 'Failed to retrieve developer statistics');
    }
};
exports.getDeveloperStats = getDeveloperStats;
