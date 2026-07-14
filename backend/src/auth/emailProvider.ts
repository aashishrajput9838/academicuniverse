// src/auth/emailProvider.ts
import { IAuthProvider, AuthPayload } from './provider';
import bcrypt from 'bcryptjs';
import User from '../models/User'; // default export

/**
 * Email + Password authentication provider.
 * Expects request body { email: string, password: string }.
 * Returns normalized AuthPayload.
 */
export class EmailPasswordProvider implements IAuthProvider {
  async authenticate(request: any): Promise<AuthPayload> {
    const { email, password } = request;
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user (stub) – actual password verification is done here
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.password) { throw new Error('User has no password set'); }
    const passwordMatches = await bcrypt.compare(password, user.password as string);
    if (!passwordMatches) {
      throw new Error('Invalid credentials');
    }

    // For email/password, providerUserId will be the email itself (unique per user)
    return {
      provider: 'password',
      providerUserId: email,
      email,
      emailVerified: true, // email/password sign‑up assumes verification flow elsewhere
      rawProfile: { name: user.name },
    };
  }
}
