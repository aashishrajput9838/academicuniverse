import crypto from 'crypto';
import { google } from 'googleapis';
import User, { IGmailTokens } from '../models/User';
import { EncryptionUtil } from '../utils/encryption';

const normalizeResolvedGmailTokens = (tokens: IGmailTokens): { accessToken: string; refreshToken: string; expiryDate: number } => {
    if (!tokens || typeof tokens !== 'object') {
        return { accessToken: '', refreshToken: '', expiryDate: 0 };
    }

    if (tokens.accessToken || tokens.refreshToken) {
        return {
            accessToken: tokens.accessToken || '',
            refreshToken: tokens.refreshToken || '',
            expiryDate: tokens.expiryDate || 0,
        };
    }

    if (tokens.encryptedToken && tokens.iv) {
        try {
            const decrypted = EncryptionUtil.decrypt(tokens.encryptedToken, tokens.iv);
            const parsed = JSON.parse(decrypted) as { accessToken?: string; refreshToken?: string; expiryDate?: number };
            return {
                accessToken: parsed.accessToken || '',
                refreshToken: parsed.refreshToken || '',
                expiryDate: parsed.expiryDate || tokens.expiryDate || 0,
            };
        } catch (decErr) {
            console.warn('[Gmail Auth] Failed to decrypt stored tokens:', decErr);
        }
    }

    return { accessToken: '', refreshToken: '', expiryDate: 0 };
};

const persistEncryptedGmailTokens = async (user: any, tokens: { accessToken: string; refreshToken: string; expiryDate: number }) => {
    const payload = JSON.stringify({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiryDate: tokens.expiryDate,
    });

    const { iv, encryptedData } = EncryptionUtil.encrypt(payload);
    user.gmailTokens = {
        encryptedToken: encryptedData,
        iv,
        expiryDate: tokens.expiryDate,
        updatedAt: new Date(),
        version: 1,
    };
    await user.save();
};

export const getStoredGmailTokens = async (userId: string): Promise<{ accessToken: string; refreshToken: string; expiryDate: number }> => {
    const user = await User.findById(userId);
    if (!user || !user.gmailTokens) {
        throw new Error('User not found or Gmail tokens missing');
    }

    return normalizeResolvedGmailTokens(user.gmailTokens as IGmailTokens);
};

export const getRedirectUri = (): string => {
    const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
    const isProd = process.env.NODE_ENV === 'production';

    if (configured) {
        if (isProd && configured.includes('localhost')) {
            console.warn('[Google OAuth Audit] Overriding localhost GOOGLE_REDIRECT_URI in production to https://academicuniverse.onrender.com/api/gmail/callback');
            return 'https://academicuniverse.onrender.com/api/gmail/callback';
        }
        return configured;
    }

    const backendUrl = process.env.BACKEND_URL || process.env.APP_URL || (
        isProd
            ? 'https://academicuniverse.onrender.com'
            : `http://localhost:${process.env.PORT || 10000}`
    );
    return `${backendUrl.replace(/\/$/, '')}/api/gmail/callback`;
};

export const getOAuth2Client = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = getRedirectUri();

    if (!clientId || !clientSecret || !redirectUri) {
        console.error('Missing Google OAuth environment variables:', { 
            clientId: !!clientId, 
            clientSecret: !!clientSecret, 
            redirectUri 
        });
        throw new Error('Google OAuth configuration is incomplete');
    }

    return new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );
};

export const refreshAccessToken = async (userId: string): Promise<{ accessToken: string; refreshToken: string; expiryDate: number }> => {
    const user = await User.findById(userId);
    if (!user || !user.gmailTokens) {
        throw new Error('User not found or Gmail tokens missing');
    }

    const storedTokens = normalizeResolvedGmailTokens(user.gmailTokens as IGmailTokens);
    if (!storedTokens.refreshToken) {
        throw new Error('No refresh token available');
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        refresh_token: storedTokens.refreshToken
    });

    const credentials = await oauth2Client.refreshAccessToken();
    const newTokens = credentials.credentials;

    const updatedTokens = {
        accessToken: newTokens.access_token || storedTokens.accessToken,
        refreshToken: newTokens.refresh_token || storedTokens.refreshToken,
        expiryDate: newTokens.expiry_date || storedTokens.expiryDate,
    };

    await persistEncryptedGmailTokens(user, updatedTokens);

    return updatedTokens;
};

export const getGmailAuthUrl = (userId: string, state?: string) => {
    const oauth2Client = getOAuth2Client();
    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
    ];
    const nonce = state || crypto.randomBytes(32).toString('hex');

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes,
        state: nonce,
    });

    console.log("[CONFIG_AUDIT] Generated auth URL:", authUrl);
    
    // Parse and log individual URL parameters
    const urlObj = new URL(authUrl);
    console.log("[CONFIG_AUDIT] URL param client_id:", urlObj.searchParams.get('client_id'));
    console.log("[CONFIG_AUDIT] URL param redirect_uri:", JSON.stringify(urlObj.searchParams.get('redirect_uri')));
    console.log("[CONFIG_AUDIT] URL param response_type:", urlObj.searchParams.get('response_type'));
    console.log("[CONFIG_AUDIT] URL param scope:", urlObj.searchParams.get('scope'));
    console.log("[CONFIG_AUDIT] URL param state:", urlObj.searchParams.get('state'));
    
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

    let existingTokens: { accessToken: string; refreshToken: string; expiryDate: number } | null = null;
    try {
        if (user.gmailTokens) {
            existingTokens = normalizeResolvedGmailTokens(user.gmailTokens as IGmailTokens);
        }
    } catch (e) {
        console.warn('[Gmail Auth] Failed to read existing tokens, proceeding with new tokens:', e);
    }

    // Update the user's gmail tokens
    // CRITICAL: Google only sends refresh_token on the first consent.
    // We must preserve the existing one if the new tokens don't include it.
    const updatedTokens: IGmailTokens = {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || existingTokens?.refreshToken || '',
        expiryDate: tokens.expiry_date || existingTokens?.expiryDate || 0,
    };

    await persistEncryptedGmailTokens(user, {
        accessToken: updatedTokens.accessToken || '',
        refreshToken: updatedTokens.refreshToken || '',
        expiryDate: updatedTokens.expiryDate || 0,
    });

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

  const storedTokens = normalizeResolvedGmailTokens(user.gmailTokens as IGmailTokens);

  // Check and refresh token if needed
  const now = Date.now();
  const isExpired = !storedTokens.expiryDate || storedTokens.expiryDate < now + 5 * 60 * 1000;
  if (isExpired) {
    await refreshAccessToken(userId);
    const refreshedUser = await User.findById(userId);
    if (!refreshedUser || !refreshedUser.gmailTokens) throw new Error('Token refresh failed');
    const refreshedTokens = normalizeResolvedGmailTokens(refreshedUser.gmailTokens as IGmailTokens);
    Object.assign(storedTokens, refreshedTokens);
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: storedTokens.accessToken,
    refresh_token: storedTokens.refreshToken,
    expiry_date: storedTokens.expiryDate,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Get profile which includes total messages count
  const profile = await gmail.users.getProfile({ userId: 'me' });
  return {
    totalMessages: profile.data.messagesTotal,
    totalThreads: profile.data.threadsTotal,
  };
};
