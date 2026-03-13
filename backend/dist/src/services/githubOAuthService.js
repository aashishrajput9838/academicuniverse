"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubOAuthService = void 0;
const axios_1 = __importDefault(require("axios"));
const encryption_1 = require("../utils/encryption");
const models_1 = require("../models");
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('githubOAuthService');
class GithubOAuthService {
    constructor() {
        this.clientId = process.env.GITHUB_CLIENT_ID || '';
        this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
        this.redirectUri = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/github/callback`;
        if (!this.clientId || !this.clientSecret) {
            logger.warn('GITHUB_CLIENT_ID and/or GITHUB_CLIENT_SECRET not set in environment variables. GitHub OAuth features will be unavailable.');
        }
    }
    /**
     * Generates the GitHub OAuth authorization URL
     * @param state A random string to prevent CSRF attacks
     * @returns The authorization URL
     */
    getAuthorizationUrl(state) {
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
    async exchangeCodeForToken(code, state) {
        if (!this.clientId || !this.clientSecret) {
            throw new Error('GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.');
        }
        try {
            const response = await axios_1.default.post('https://github.com/login/oauth/access_token', {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code,
                redirect_uri: this.redirectUri,
            }, {
                headers: {
                    Accept: 'application/json',
                },
            });
            if (response.data.error) {
                throw new Error(`GitHub OAuth error: ${response.data.error}`);
            }
            return response.data.access_token;
        }
        catch (error) {
            logger.error('Error exchanging code for token:', error.message);
            throw new Error(`Failed to exchange code for token: ${error.message}`);
        }
    }
    /**
     * Stores the encrypted access token in the user's profile
     * @param firebaseUid The Firebase UID of the user
     * @param accessToken The GitHub access token to store
     */
    async storeAccessToken(firebaseUid, accessToken) {
        try {
            // Encrypt the access token
            const { iv, encryptedData } = encryption_1.EncryptionUtil.encrypt(accessToken);
            // Update the user's GitHub access token in the database
            const user = await models_1.User.findOne({ firebaseUid });
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
        }
        catch (error) {
            logger.error('Error storing GitHub access token:', error.message);
            throw new Error(`Failed to store GitHub access token: ${error.message}`);
        }
    }
    /**
     * Retrieves and decrypts the access token for a user
     * @param firebaseUid The Firebase UID of the user
     * @returns The decrypted access token
     */
    async getAccessToken(firebaseUid) {
        try {
            const user = await models_1.User.findOne({ firebaseUid });
            if (!user || !user.githubAccessToken) {
                throw new Error('GitHub access token not found for user');
            }
            const { encryptedToken, iv } = user.githubAccessToken;
            const decryptedToken = encryption_1.EncryptionUtil.decrypt(encryptedToken, iv);
            return decryptedToken;
        }
        catch (error) {
            logger.error('Error retrieving GitHub access token:', error.message);
            throw new Error(`Failed to retrieve GitHub access token: ${error.message}`);
        }
    }
    /**
     * Removes the access token from the user's profile
     * @param firebaseUid The Firebase UID of the user
     */
    async removeAccessToken(firebaseUid) {
        try {
            const user = await models_1.User.findOne({ firebaseUid });
            if (!user) {
                throw new Error('User not found');
            }
            user.githubAccessToken = undefined;
            await user.save();
            logger.info(`GitHub access token removed for user: ${firebaseUid}`);
        }
        catch (error) {
            logger.error('Error removing GitHub access token:', error.message);
            throw new Error(`Failed to remove GitHub access token: ${error.message}`);
        }
    }
}
exports.GithubOAuthService = GithubOAuthService;
exports.default = new GithubOAuthService();
