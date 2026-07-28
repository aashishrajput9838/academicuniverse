import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models';
import { Logger } from '../utils/logger';
import getGithubOAuthService from '../services/githubOAuthService';
import analyticsService from '../services/analyticsService';
import { sendResponse, sendError } from '../utils/response';

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Extend the Express session interface
declare module 'express-session' {
  interface SessionData {
    github_oauth_state?: string;
    firebase_uid?: string;
  }
}

const logger = new Logger('githubOAuthController');

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    organizationId: string;
    roleId: string;
    permissions: string[];
    isSuperAdmin: boolean;
    firebaseUid?: string;
  };
  organizationId?: string;
}

/**
 * Initiates the GitHub OAuth flow
 * POST /api/github/connect
 */
export const connectGithub = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    const firebaseUid = req.user.firebaseUid || req.user.userId;
    const state = jwt.sign({ firebaseUid, purpose: 'github_oauth' }, JWT_SECRET, { expiresIn: '15m' });

    req.session.github_oauth_state = state;
    req.session.firebase_uid = firebaseUid;

    const githubOAuthService = getGithubOAuthService();
    const authUrl = githubOAuthService.getAuthorizationUrl(state);

    logger.info(`GitHub OAuth initiated for user: ${req.user.email}`);

    return sendResponse(res, 200, { authUrl, state }, 'GitHub OAuth initiated');
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

    // Verify the state parameter (JWT decoded first, fallback to session)
    let firebaseUid: string | null = null;
    try {
      const decoded = jwt.verify(state, JWT_SECRET) as { firebaseUid: string; purpose?: string };
      if (decoded && decoded.firebaseUid && decoded.purpose === 'github_oauth') {
        firebaseUid = decoded.firebaseUid;
      }
    } catch (jwtErr) {
      if (state === req.session.github_oauth_state) {
        firebaseUid = req.session.firebase_uid || null;
      }
    }

    if (!firebaseUid) {
      return sendError(res, 400, 'Invalid state parameter or expired session');
    }

    // Exchange the authorization code for an access token
    const githubOAuthService = getGithubOAuthService();
    const accessToken = await githubOAuthService.exchangeCodeForToken(code, state);

    // Fetch GitHub username
    const githubUsername = await githubOAuthService.getGithubUsername(accessToken);

    // Store the access token and username in the user's profile
    await githubOAuthService.storeAccessToken(firebaseUid, accessToken);

    // Update the GitHub username
    const user = await User.findOne({ firebaseUid });
    if (user) {
      user.githubUsername = githubUsername;
      await user.save();
    }

    // Clear the session data
    delete req.session.github_oauth_state;
    delete req.session.firebase_uid;

    const getFrontendUrl = () => {
      const origin = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
      // If it's a comma-separated list, take the first one
      return origin.split(',')[0].trim();
    };
    const frontendUrl = getFrontendUrl();

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
              setTimeout(() => window.close(), 100);
            }
            // Or redirect to main app if not in popup
            setTimeout(() => {
              window.location.href = '${frontendUrl}';
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

    const getFrontendUrl = () => {
      const origin = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
      // If it's a comma-separated list, take the first one
      return origin.split(',')[0].trim();
    };
    const frontendUrl = getFrontendUrl();
    
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
              setTimeout(() => window.close(), 100);
            }
            // Or redirect to main app if not in popup
            setTimeout(() => {
              window.location.href = '${frontendUrl}?error=${encodeURIComponent(error.message)}';
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
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    const githubOAuthService = getGithubOAuthService();
    await githubOAuthService.removeAccessToken(req.user.firebaseUid!);

    logger.info(`GitHub account disconnected for user: ${req.user.email}`);

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
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    const stats = await analyticsService.processDeveloperAnalytics(req.user.firebaseUid!);

    logger.info(`Developer stats retrieved for user: ${req.user.email}`);

    return sendResponse(res, 200, stats, 'Developer statistics retrieved successfully');
  } catch (error: any) {
    logger.error('Error retrieving developer stats:', error);
    
    if (error.message.includes('GitHub access token')) {
      return sendResponse(res, 200, null, 'GitHub OAuth not connected');
    }
    
    return sendError(res, 500, 'Failed to retrieve developer statistics');
  }
};

/**
 * Gets GitHub OAuth connection status
 * GET /api/github/connection-status
 */
export const getGithubConnectionStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    const githubOAuthService = getGithubOAuthService();
    const connected = await githubOAuthService.hasGithubOAuthConnection(req.user.firebaseUid!);

    return sendResponse(res, 200, { connected }, 'GitHub connection status retrieved');
  } catch (error: any) {
    logger.error('Error retrieving GitHub connection status:', error);
    return sendError(res, 500, 'Failed to retrieve GitHub connection status');
  }
};
