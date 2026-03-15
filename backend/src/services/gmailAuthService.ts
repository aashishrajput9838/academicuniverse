import { google } from 'googleapis';
import User from '../models/User';

export const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
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

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Update the user's gmail tokens
    user.gmailTokens = {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || '',
        expiryDate: tokens.expiry_date || 0,
    };

    await user.save();
    return tokens;
};

export const disconnectGmail = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.gmailTokens = undefined;
    await user.save();
};
