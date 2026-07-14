export interface EmailPasswordPayload {
  email: string;
  password: string;
}

export interface GoogleOAuthPayload {
  idToken: string;
}

export type AuthProviderKey = 'password' | 'google';

export type AuthenticationRequest =
  | { provider: 'password'; payload: EmailPasswordPayload }
  | { provider: 'google'; payload: GoogleOAuthPayload };
