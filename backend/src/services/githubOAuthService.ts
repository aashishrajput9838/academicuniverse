import axios from 'axios';
import { EncryptionUtil } from '../utils/encryption';
import { User } from '../models';
import { Logger } from '../utils/logger';

const logger = new Logger('githubOAuthService');

export class GithubOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
    this.redirectUri = `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || '5003'}`}/api/github/callback`;
    
    if (!this.clientId || !this.clientSecret) {
      logger.warn('GITHUB_CLIENT_ID and/or GITHUB_CLIENT_SECRET not set in environment variables. GitHub OAuth features will be unavailable.');
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
    url.searchParams.append('redirect_uri', this.redirectUri);
    url.searchParams.append('scope', scope);
    url.searchParams.append('state', state);
    
    return url.toString();
  }

  /**
   * Exchanges the authorization code for an access token
   * @param code The authorization code received from GitHub
   * @param state The state parameter for CSRF protection
   * @returns The access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.');
    }
    
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (response.data.error) {
        throw new Error(`GitHub OAuth error: ${response.data.error}`);
      }

      return response.data.access_token;
    } catch (error: any) {
      logger.error('Error exchanging code for token:', error.message);
      throw new Error(`Failed to exchange code for token: ${error.message}`);
    }
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