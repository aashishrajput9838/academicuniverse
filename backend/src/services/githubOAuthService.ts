import axios from 'axios';
import { EncryptionUtil } from '../utils/encryption';
import { User } from '../models';
import { Logger } from '../utils/logger';

const logger = new Logger('githubOAuthService');

export class GithubOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  private getRedirectUri(): string {
    if (process.env.GITHUB_REDIRECT_URI && process.env.GITHUB_REDIRECT_URI.trim()) {
      return process.env.GITHUB_REDIRECT_URI.trim();
    }
    const backendUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || (process.env.NODE_ENV === 'production' ? 'https://academicuniverse.onrender.com' : 'http://localhost:5000');
    return `${backendUrl.replace(/\/$/, '')}/api/github/callback`;
  }

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
    this.redirectUri = this.getRedirectUri();
    
    if (!this.clientId || !this.clientSecret) {
      logger.warn('GITHUB_CLIENT_ID and/or GITHUB_CLIENT_SECRET not set in environment variables. GitHub OAuth will use direct sync fallback.');
    }
  }

  /**
   * Generates the GitHub OAuth authorization URL
   * @param state A random string to prevent CSRF attacks
   * @returns The authorization URL
   */
  getAuthorizationUrl(state: string): string {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.');
    }
    
    const scope = 'read:user repo';
    const url = new URL('https://github.com/login/oauth/authorize');
    
    url.searchParams.append('client_id', this.clientId);
    url.searchParams.append('redirect_uri', this.getRedirectUri());
    url.searchParams.append('scope', scope);
    url.searchParams.append('state', state);
    
    return url.toString();
  }

  /**
   * Exchanges the authorization code for an access token
   * @param code The authorization code received from GitHub
   * @param state The state parameter for CSRF protection
   * @param customRedirectUri Optional custom redirect URI used during authorization
   * @returns The access token
   */
  async exchangeCodeForToken(code: string, state: string, customRedirectUri?: string): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.');
    }
    
    const redirectUrisToTry = [
      customRedirectUri,
      this.getRedirectUri(),
      'http://localhost:10000/api/github/callback',
      'http://localhost:5000/api/github/callback',
      'http://localhost:3000/api/github/callback',
      'https://academicuniverse.onrender.com/api/github/callback',
      'https://academicuniverse.vercel.app/api/github/callback',
      undefined,
    ].filter((uri, index, self) => uri === undefined || (typeof uri === 'string' && uri.trim() !== '' && self.indexOf(uri) === index));

    let lastError: any = null;

    for (const uri of redirectUrisToTry) {
      try {
        const payload: any = {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
        };
        if (uri) payload.redirect_uri = uri;

        const response = await axios.post(
          'https://github.com/login/oauth/access_token',
          payload,
          {
            headers: {
              Accept: 'application/json',
            },
          }
        );

        if (response.data && response.data.access_token) {
          logger.info(`GitHub token exchange successful using redirect_uri: ${uri || 'none'}`);
          return response.data.access_token;
        }

        if (response.data && response.data.error) {
          lastError = response.data.error_description || response.data.error;
        }
      } catch (error: any) {
        lastError = error.response?.data?.error_description || error.message;
      }
    }

    logger.error('Error exchanging code for token after trying all redirect URIs:', lastError);
    throw new Error(`Failed to exchange code for token: ${lastError || 'Unknown error'}`);
  }

  /**
   * Stores the encrypted access token in the user's profile
   * @param firebaseUid The Firebase UID of the user
   * @param accessToken The GitHub access token to store
   */
  async storeAccessToken(firebaseUid: string, accessToken: string): Promise<void> {
    try {
      const { iv, encryptedData } = EncryptionUtil.encrypt(accessToken);

      const user = await User.findOne({ firebaseUid });
      if (!user) {
        throw new Error('User not found');
      }

      user.githubAccessToken = {
        encryptedToken: encryptedData,
        iv,
        updatedAt: new Date(),
      };

      await user.save();
      logger.info(`GitHub access token stored for user: ${firebaseUid}`);
    } catch (error: any) {
      logger.error('Error storing GitHub access token:', error.message);
      throw new Error(`Failed to store GitHub access token: ${error.message}`);
    }
  }

  /**
   * Fetches the GitHub username for a user using their access token
   * @param accessToken The GitHub access token
   * @returns The GitHub username
   */
  async getGithubUsername(accessToken: string): Promise<string> {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Academic-Universe-App'
        }
      });

      return response.data.login;
    } catch (error: any) {
      logger.error('Error fetching GitHub username:', error.message);
      throw new Error(`Failed to fetch GitHub username: ${error.message}`);
    }
  }

  /**
   * Retrieves and decrypts the access token for a user
   * @param firebaseUid The Firebase UID of the user
   * @returns The decrypted access token
   */
  async getAccessToken(firebaseUid: string): Promise<string> {
    try {
      const user = await User.findOne({ firebaseUid });
      if (!user || !user.githubAccessToken) {
        throw new Error('GitHub access token not found for user');
      }

      const { encryptedToken, iv } = user.githubAccessToken;
      const decryptedToken = EncryptionUtil.decrypt(encryptedToken, iv);

      return decryptedToken;
    } catch (error: any) {
      logger.error('Error retrieving GitHub access token:', error.message);
      throw new Error(`Failed to retrieve GitHub access token: ${error.message}`);
    }
  }

  /**
   * Removes the access token from the user's profile
   * @param firebaseUid The Firebase UID of the user
   */
  async removeAccessToken(firebaseUid: string): Promise<void> {
    try {
      const user = await User.findOne({ firebaseUid });
      if (!user) {
        throw new Error('User not found');
      }

      user.githubAccessToken = undefined;
      await user.save();

      logger.info(`GitHub access token removed for user: ${firebaseUid}`);
    } catch (error: any) {
      logger.error('Error removing GitHub access token:', error.message);
      throw new Error(`Failed to remove GitHub access token: ${error.message}`);
    }
  }

  /**
   * Checks whether the user has a stored GitHub OAuth connection.
   * Does NOT decrypt the token.
   * @param firebaseUid The Firebase UID of the user
   * @returns true if githubAccessToken exists, false otherwise
   */
  async hasGithubOAuthConnection(firebaseUid: string): Promise<boolean> {
    try {
      const user = await User.findOne({ firebaseUid }).select('githubAccessToken');
      return !!user?.githubAccessToken?.encryptedToken;
    } catch (error: any) {
      logger.error('Error checking GitHub OAuth connection status:', error.message);
      return false;
    }
  }
}

// Create a singleton instance getter that initializes on first use
let githubOAuthServiceInstance: GithubOAuthService | null = null;

export const getGithubOAuthService = (): GithubOAuthService => {
  if (!githubOAuthServiceInstance) {
    githubOAuthServiceInstance = new GithubOAuthService();
  }
  return githubOAuthServiceInstance;
};

export default getGithubOAuthService;