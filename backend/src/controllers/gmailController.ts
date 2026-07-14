import { Request, Response } from 'express';
import crypto from 'crypto';
import { getGmailAuthUrl, handleGmailCallback, disconnectGmail, getGmailStats } from '../services/gmailAuthService';
import { syncGmailEvents } from '../services/gmailSyncService';
import { listGmailMessages, getGmailMessage } from '../services/gmailMessageService';
import { markMessageAsRead } from '../services/gmailMessageService';
import { sendResponse, sendError } from '../utils/response';
import User from '../models/User';

declare module 'express-session' {
    interface SessionData {
        gmail_oauth_state?: string;
        gmail_oauth_user_id?: string;
    }
}

export const connectGmail = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId || req.user._id;
        const oauthState = crypto.randomBytes(32).toString('hex');

        req.session = req.session || {};
        req.session.gmail_oauth_state = oauthState;
        req.session.gmail_oauth_user_id = String(userId);

        const authUrl = getGmailAuthUrl(userId.toString(), oauthState);
        return sendResponse(res, 200, { authUrl }, 'Auth URL generated successfully');
    } catch (error: any) {
        console.error('Error generating Gmail auth URL:', error);
        return sendError(res, 500, 'Failed to generate connection URL');
    }
};

export const gmailCallback = async (req: Request, res: Response) => {
    try {
        const { code, state, error } = req.query;

        const getFrontendUrl = () => {
            const origin = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
            // If it's a comma-separated list, take the first one
            return origin.split(',')[0].trim();
        };
        const frontendUrl = getFrontendUrl();
        const redirectUrl = `${frontendUrl}/dashboard/student/events`;

        if (error) {
            console.error('Gmail OAuth error:', error);
            return res.redirect(`${redirectUrl}?gmail_error=access_denied`);
        }

        if (!code || !state) {
            return res.redirect(`${redirectUrl}?gmail_error=missing_params`);
        }

        const sessionState = req.session?.gmail_oauth_state;
        const sessionUserId = req.session?.gmail_oauth_user_id;

        if (!sessionState || !sessionUserId || sessionState !== state) {
            return res.redirect(`${redirectUrl}?gmail_error=invalid_state`);
        }

        const userId = sessionUserId;
        await handleGmailCallback(code as string, userId);

        // Initial sync right after connecting
        try {
            await syncGmailEvents(userId);
        } catch (syncErr) {
            console.error('Initial sync failed after connecting Gmail:', syncErr);
        }

        delete req.session?.gmail_oauth_state;
        delete req.session?.gmail_oauth_user_id;

        return res.redirect(`${redirectUrl}?gmail_success=true`);
    } catch (error: any) {
        console.error('Error handling Gmail callback:', error);
        const getFrontendUrl = () => {
            const origin = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
            // If it's a comma-separated list, take the first one
            return origin.split(',')[0].trim();
        };
        const frontendUrl = getFrontendUrl();
        
        delete req.session?.gmail_oauth_state;
        delete req.session?.gmail_oauth_user_id;

        // Map common errors to specific codes for better frontend handling
        let errorCode = 'server_error';
        if (error.message?.includes('invalid_grant')) errorCode = 'invalid_grant';
        else if (error.message?.includes('User not found')) errorCode = 'user_not_found';
        else if (error.message?.includes('redirect_uri_mismatch')) errorCode = 'redirect_mismatch';
        else if (error.message?.includes('configuration is incomplete')) errorCode = 'config_incomplete';

        return res.redirect(`${frontendUrl}/dashboard/student/events?gmail_error=${errorCode}`);
    }
};

export const disconnectGmailAccount = async (req: any, res: Response) => {
    console.log("🔙 [Backend] disconnectGmailAccount controller ENTERED!");
    console.log("🔙 [Backend] req.user object:", JSON.stringify(req.user, null, 2));
    try {
        const userId = req.user.userId || req.user._id;
        console.log("🔙 [Backend] User ID from auth middleware:", userId);
        await disconnectGmail(userId.toString());
        console.log("🔙 [Backend] disconnectGmail service finished successfully!");
        return sendResponse(res, 200, null, 'Gmail disconnected successfully');
    } catch (error: any) {
        console.error('🔙 [Backend] Error disconnecting Gmail:', error);
        return sendError(res, 500, 'Failed to disconnect Gmail account');
    }
};

export const getGmailStatus = async (req: any, res: Response) => {
    console.log("🔙 [Backend] getGmailStatus controller ENTERED!");
    console.log("🔙 [Backend] getGmailStatus req.user object:", JSON.stringify(req.user, null, 2));
    try {
        const userId = req.user.userId || req.user._id;
        console.log("🔙 [Backend] getGmailStatus userId:", userId);
        const userLean = await User.findById(userId).lean();
        console.log("🔙 [Backend] getGmailStatus userLean._id:", userLean?._id);
        console.log("🔙 [Backend] getGmailStatus (lean): hasOwnProperty('gmailTokens')?", userLean?.hasOwnProperty('gmailTokens'));
        const isConnected = userLean?.hasOwnProperty('gmailTokens') && !!userLean.gmailTokens;
        console.log("🔙 [Backend] getGmailStatus returning connected:", isConnected);
        return sendResponse(res, 200, { connected: isConnected }, 'Gmail status retrieved successfully');
    } catch (error: any) {
        console.error('🔙 [Backend] Error getting Gmail status:', error);
        return sendError(res, 500, 'Failed to get Gmail status');
    }
};

export const listGmailMessagesController = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId || req.user._id;
        const { pageToken, maxResults, q, labelIds } = req.query;

        const parsedMaxResults = maxResults ? Math.min(Number(maxResults), 50) : undefined;

        const result = await listGmailMessages(userId.toString(), {
            pageToken: pageToken ? String(pageToken) : undefined,
            maxResults: parsedMaxResults,
            q: q ? String(q) : undefined,
            labelIds: labelIds ? labelIds : undefined,
        });

        return sendResponse(res, 200, result, 'Gmail messages retrieved successfully');
    } catch (error: any) {
        console.error('Error listing Gmail messages:', error);
        const message = error.message || 'Failed to list Gmail messages';
        const statusCode = error.statusCode || (error?.response?.status === 429 ? 429 : 500);
        if (statusCode === 429 && !message.toLowerCase().includes('rate limit')) {
            error.message = 'Rate limit exceeded. Please wait and try again.';
        }
        if (error?.response?.headers?.get?.('retry-after')) {
            res.setHeader('Retry-After', error.response.headers.get('retry-after'));
        } else if (error?.response?.headers?.['retry-after']) {
            res.setHeader('Retry-After', error.response.headers['retry-after']);
        }
        return sendError(res, statusCode, error.message || message);
    }
};

export const getGmailMessageController = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId || req.user._id;
        const { messageId } = req.params;

        if (!messageId) {
            return sendError(res, 400, 'Message ID is required');
        }

        const result = await getGmailMessage(userId.toString(), messageId);
        return sendResponse(res, 200, result, 'Gmail message retrieved successfully');
    } catch (error: any) {
        console.error('Error fetching Gmail message detail:', error);
        const message = error.message || 'Failed to fetch Gmail message detail';
        return sendError(res, error.statusCode || 500, message);
    }
};

export const markGmailMessageReadController = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId || req.user._id;
        const { messageId } = req.params;
        if (!messageId) return sendError(res, 400, 'Message ID is required');
        await markMessageAsRead(userId.toString(), messageId);
        return sendResponse(res, 200, { success: true }, 'Message marked as read');
    } catch (error: any) {
        console.error('Error marking Gmail message read:', error);
        return sendError(res, error.statusCode || 500, error.message || 'Failed to mark message as read');
    }
};

export const triggerGmailSync = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId || req.user._id;
        const result = await syncGmailEvents(userId.toString());

        return sendResponse(res, 200, result, 'Gmail sync completed');
    } catch (error: any) {
        console.error('Error syncing Gmail events:', error);

        // Provide a better error messages
        if (error.message && (error.message.includes('not connected') || error.message.includes('expired'))) {
            return sendError(res, 400, error.message);
        }

        return sendError(res, 500, 'Failed to sync Gmail events');
    }
};

export const getGmailStatsController = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId || req.user._id;
        const stats = await getGmailStats(userId.toString());
        return sendResponse(res, 200, stats, 'Gmail stats retrieved successfully');
    } catch (error: any) {
        console.error('Error getting Gmail stats:', error);
        return sendError(res, 500, 'Failed to get Gmail stats');
    }
};
