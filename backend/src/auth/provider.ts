// src/auth/provider.ts
export interface AuthPayload {
  provider: string;
  providerUserId: string; // e.g., sub for OIDC, user id for password
  email: string;
  emailVerified: boolean;
  rawProfile?: any; // full provider profile for future use
}

export interface IAuthProvider {
  /**
   * Authenticate using provider‑specific data and return a normalized AuthPayload.
   * Should throw an error if authentication fails.
   */
  authenticate(request: any): Promise<AuthPayload>;
}
