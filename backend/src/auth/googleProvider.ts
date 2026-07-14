// src/auth/googleProvider.ts
import { IAuthProvider, AuthPayload } from './provider';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

/**
 * Google OAuth authentication provider.
 * Verifies a Google ID token using the official library and returns a normalized AuthPayload.
 * Production verification uses the GOOGLE_CLIENT_ID environment variable.
 * For tests, the OAuth2Client can be mocked.
 */
export class GoogleOAuthProvider implements IAuthProvider {
  private client: OAuth2Client;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      // In development/testing the clientId may be empty; the verification will be mocked.
      this.client = new OAuth2Client();
    } else {
      this.client = new OAuth2Client(clientId);
    }
  }

  async authenticate(request: any): Promise<AuthPayload> {
    const { idToken } = request;
    if (!idToken) {
      throw new Error('Google ID token is required');
    }

    // Verify the token; this will throw if invalid.
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload() as TokenPayload | undefined;
    if (!payload || !payload.email || !payload.sub) {
      throw new Error('Invalid Google token payload');
    }

    return {
      provider: 'google',
      providerUserId: payload.sub,
      email: payload.email,
      emailVerified: Boolean(payload.email_verified),
      rawProfile: payload,
    };
  }
}
