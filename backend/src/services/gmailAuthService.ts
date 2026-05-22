import { google } from 'googleapis';
import User, { IGmailTokens } from '../models/User';

export const getOAuth2Client = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        console.error('Missing Google OAuth environment variables:', { 
            clientId: !!clientId, 
            clientSecret: !!clientSecret, 
            redirectUri: !!redirectUri 
        });
        throw new Error('Google OAuth configuration is incomplete');
    }

    return new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );
};

export const getGmailAuthUrl = (userId: string) => {
    const oauth2Client = getOAuth2Client();
    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes,
        state: userId, // Pass userId in state to identify user on callback
    });
};

export const handleGmailCallback = async (code: string, userId: string) => {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!userId) {
        throw new Error('No userId provided in state');
    }

    const user = await User.findById(userId);
    if (!user) throw new Error(`User not found with ID: ${userId}`);

    // Update the user's gmail tokens
    // CRITICAL: Google only sends refresh_token on the first consent.
    // We must preserve the existing one if the new tokens don't include it.
    const updatedTokens: IGmailTokens = {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || user.gmailTokens?.refreshToken || '',
        expiryDate: tokens.expiry_date || 0,
    };

    user.gmailTokens = updatedTokens;

    await user.save();
    return tokens;
};

export const disconnectGmail = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.gmailTokens = undefined;
    await user.save();
};
