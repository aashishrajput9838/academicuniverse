import { Request, Response } from 'express';
import { getGmailAuthUrl, handleGmailCallback, disconnectGmail } from '../services/gmailAuthService';
import { syncGmailEvents } from '../services/gmailSyncService';
import { sendResponse, sendError } from '../utils/response';

export const connectGmail = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId || req.user._id;
        const authUrl = getGmailAuthUrl(userId.toString());
        return sendResponse(res, 200, { authUrl }, 'Auth URL generated successfully');
    } catch (error: any) {
        console.error('Error generating Gmail auth URL:', error);
        return sendError(res, 500, 'Failed to generate connection URL');
    }
};

export const gmailCallback = async (req: Request, res: Response) => {
    try {
        const { code, state, error } = req.query;

        const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
        const redirectUrl = `${frontendUrl}/dashboard/student/events`;

        if (error) {
            console.error('Gmail OAuth error:', error);
            return res.redirect(`${redirectUrl}?gmail_error=access_denied`);
        }

        if (!code || !state) {
            return res.redirect(`${redirectUrl}?gmail_error=missing_params`);
        }

        const userId = state as string;
        await handleGmailCallback(code as string, userId);

        // Initial sync right after connecting
        try {
            await syncGmailEvents(userId);
        } catch (syncErr) {
            console.error('Initial sync failed after connecting Gmail:', syncErr);
        }

        return res.redirect(`${redirectUrl}?gmail_success=true`);
    } catch (error: any) {
        console.error('Error handling Gmail callback:', error);
        const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/dashboard/student/events?gmail_error=server_error`);
    }
};

export const disconnectGmailAccount = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId || req.user._id;
        await disconnectGmail(userId.toString());
        return sendResponse(res, 200, null, 'Gmail disconnected successfully');
    } catch (error: any) {
        console.error('Error disconnecting Gmail:', error);
        return sendError(res, 500, 'Failed to disconnect Gmail account');
    }
};

export const triggerGmailSync = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId || req.user._id;
        const result = await syncGmailEvents(userId.toString());

        return sendResponse(res, 200, result, 'Gmail sync completed');
    } catch (error: any) {
        console.error('Error syncing Gmail events:', error);

        // Provide a better error if getting "User not found or Gmail not connected"
        if (error.message && error.message.includes('not connected')) {
            return sendError(res, 400, 'Gmail account is not connected');
        }

        return sendError(res, 500, 'Failed to sync Gmail events');
    }
};
