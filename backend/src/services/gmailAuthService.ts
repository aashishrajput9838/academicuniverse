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

export const refreshAccessToken = async (userId: string): Promise<IGmailTokens> => {
    const user = await User.findById(userId);
    if (!user || !user.gmailTokens?.refreshToken) {
        throw new Error('User not found or no refresh token available');
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        refresh_token: user.gmailTokens.refreshToken
    });

    const credentials = await oauth2Client.refreshAccessToken();
    const newTokens = credentials.credentials;

    const updatedTokens: IGmailTokens = {
        accessToken: newTokens.access_token || '',
        refreshToken: newTokens.refresh_token || user.gmailTokens.refreshToken,
        expiryDate: newTokens.expiry_date || 0,
    };

    user.gmailTokens = updatedTokens;
    await user.save();

    return updatedTokens;
};

export const getGmailAuthUrl = (userId: string) => {
    const oauth2Client = getOAuth2Client();
    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes,
        state: userId, // Pass userId in state to identify user on callback
    });

    console.log("[CONFIG_AUDIT] Generated auth URL:", authUrl);
    
    // Parse and log individual URL parameters
    const urlObj = new URL(authUrl);
    console.log("[CONFIG_AUDIT] URL param client_id:", urlObj.searchParams.get('client_id'));
    console.log("[CONFIG_AUDIT] URL param redirect_uri:", JSON.stringify(urlObj.searchParams.get('redirect_uri')));
    console.log("[CONFIG_AUDIT] URL param response_type:", urlObj.searchParams.get('response_type'));
    console.log("[CONFIG_AUDIT] URL param scope:", urlObj.searchParams.get('scope'));
    
    return authUrl;
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
  console.log("🔙 [Backend] disconnectGmail service ENTERED for userId:", userId);
  
  // 1. First, FRESH READ to get user BEFORE deletion (Mongoose doc and raw lean)
  const userBefore = await User.findById(userId);
  const userBeforeLean = await User.findById(userId).lean();
  console.log("🔙 [Backend] BEFORE $unset (Mongoose): user.gmailTokens exists?", !!userBefore?.gmailTokens);
  console.log("🔙 [Backend] BEFORE $unset (lean): hasOwnProperty('gmailTokens')?", userBeforeLean?.hasOwnProperty('gmailTokens'));
  console.log("🔙 [Backend] BEFORE $unset (lean): typeof gmailTokens:", typeof (userBeforeLean as any)?.gmailTokens);
  
  // 2. Use updateOne and $unset to reliably remove the field from the document
  const result = await User.updateOne(
    { _id: userId },
    { $unset: { gmailTokens: "" } }
  );
  
  console.log("🔙 [Backend] MongoDB update result:", { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  
  if (result.matchedCount === 0) {
    throw new Error('User not found');
  }
  
  // 3. FRESH READ again to verify the field is GONE (both Mongoose doc AND lean)
  const userAfter = await User.findById(userId);
  const userAfterLean = await User.findById(userId).lean();
  
  console.log("🔙 [Backend] AFTER $unset (Mongoose): user.gmailTokens exists?", !!userAfter?.gmailTokens);
  console.log("🔙 [Backend] AFTER $unset (lean): hasOwnProperty('gmailTokens')?", userAfterLean?.hasOwnProperty('gmailTokens'));
  console.log("🔙 [Backend] AFTER $unset (lean): typeof gmailTokens:", typeof (userAfterLean as any)?.gmailTokens);
  console.log("🔙 [Backend] AFTER $unset (lean): userAfterLean keys:", Object.keys(userAfterLean || {}));
  
  console.log(`✅ [Backend] Successfully disconnected Gmail for user ${userId}`);
};

export const getGmailStats = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (!user.gmailTokens) throw new Error('Gmail not connected');

  // Check and refresh token if needed
  const now = Date.now();
  const isExpired = !user.gmailTokens.expiryDate || user.gmailTokens.expiryDate < now + 5 * 60 * 1000;
  if (isExpired) {
    await refreshAccessToken(userId);
    const refreshedUser = await User.findById(userId);
    if (!refreshedUser || !refreshedUser.gmailTokens) throw new Error('Token refresh failed');
    user.gmailTokens = refreshedUser.gmailTokens;
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.gmailTokens.accessToken,
    refresh_token: user.gmailTokens.refreshToken,
    expiry_date: user.gmailTokens.expiryDate,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Get profile which includes total messages count
  const profile = await gmail.users.getProfile({ userId: 'me' });
  return {
    totalMessages: profile.data.messagesTotal,
    totalThreads: profile.data.threadsTotal,
  };
};
