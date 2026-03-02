import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models';
import { Logger } from '../utils/logger';
import githubOAuthService from '../services/githubOAuthService';
import analyticsService from '../services/analyticsService';
import { sendResponse, sendError } from '../utils/response';

// Extend the Express session interface
declare module 'express-session' {
  interface SessionData {
    github_oauth_state?: string;
    firebase_uid?: string;
  }
}

const logger = new Logger('githubOAuthController');

interface AuthenticatedRequest extends Request {
  firebaseUser?: {
    firebaseUid: string;
    email: string;
  };
}

/**
 * Initiates the GitHub OAuth flow
 * GET /api/github/connect
 */
export const connectGithub = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firebaseUser) {
      return sendError(res, 401, 'Authentication required');
    }

    // Generate a random state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store the Firebase UID in session for verification after callback
    req.session = req.session || {};
    req.session.github_oauth_state = state;
    req.session.firebase_uid = req.firebaseUser.firebaseUid;

    // Get the GitHub authorization URL
    const authUrl = githubOAuthService.getAuthorizationUrl(state);

    logger.info(`GitHub OAuth initiated for user: ${req.firebaseUser.email}`);

    return res.redirect(authUrl);
  } catch (error: any) {
    logger.error('Error initiating GitHub OAuth:', error);
    return sendError(res, 500, 'Failed to initiate GitHub OAuth');
  }
};

/**
 * Handles the GitHub OAuth callback
 * GET /api/github/callback
 */
export const githubOAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return sendError(res, 400, 'Authorization code is required');
    }

    if (!state || typeof state !== 'string') {
      return sendError(res, 400, 'State parameter is required for CSRF protection');
    }

    // Verify the state parameter to prevent CSRF attacks
    req.session = req.session || {};
    if (state !== req.session.github_oauth_state) {
      return sendError(res, 400, 'Invalid state parameter');
    }

    // Get the Firebase UID from session
    const firebaseUid = req.session.firebase_uid;
    if (!firebaseUid) {
      return sendError(res, 400, 'Session expired or invalid');
    }

    // Exchange the authorization code for an access token
    const accessToken = await githubOAuthService.exchangeCodeForToken(code, state);

    // Store the access token in the user's profile
    await githubOAuthService.storeAccessToken(firebaseUid, accessToken);

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
  } catch (error: any) {
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

/**
 * Disconnects the GitHub account
 * DELETE /api/github/disconnect
 */
export const disconnectGithub = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firebaseUser) {
      return sendError(res, 401, 'Authentication required');
    }

    // Remove the GitHub access token from the user's profile
    await githubOAuthService.removeAccessToken(req.firebaseUser.firebaseUid);

    logger.info(`GitHub account disconnected for user: ${req.firebaseUser.email}`);

    return sendResponse(res, 200, null, 'GitHub account disconnected successfully');
  } catch (error: any) {
    logger.error('Error disconnecting GitHub account:', error);
    return sendError(res, 500, 'Failed to disconnect GitHub account');
  }
};

/**
 * Gets processed developer statistics
 * GET /api/github/stats
 */
export const getDeveloperStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firebaseUser) {
      return sendError(res, 401, 'Authentication required');
    }

    // Process and return developer statistics
    const stats = await analyticsService.processDeveloperAnalytics(req.firebaseUser.firebaseUid);

    logger.info(`Developer stats retrieved for user: ${req.firebaseUser.email}`);

    return sendResponse(res, 200, stats, 'Developer statistics retrieved successfully');
  } catch (error: any) {
    logger.error('Error retrieving developer stats:', error);
    
    // Handle specific error cases
    if (error.message.includes('GitHub access token')) {
      // User hasn't connected GitHub OAuth - this is not an error, just not available
      return sendResponse(res, 200, null, 'GitHub OAuth not connected');
    }
    
    return sendError(res, 500, 'Failed to retrieve developer statistics');
  }
};