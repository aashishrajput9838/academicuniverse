// src/auth/googleProvider.ts
import { IAuthProvider, AuthPayload } from './provider';
import { firebaseAuth } from '../config/firebaseAdmin';

/**
 * Google OAuth authentication provider.
 * Verifies a Google/Firebase ID token and returns a normalized AuthPayload.
 */
export class GoogleOAuthProvider implements IAuthProvider {
  async authenticate(request: any): Promise<AuthPayload> {
    const { idToken } = request;
    if (!idToken) {
      throw new Error('Google ID token is required');
    }

    // Verify the Firebase ID token.
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    if (!decodedToken || !decodedToken.email || !decodedToken.uid) {
      throw new Error('Invalid Firebase/Google token payload');
    }

    return {
      provider: 'google',
      providerUserId: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: Boolean(decodedToken.email_verified),
      rawProfile: decodedToken,
    };
  }
}
