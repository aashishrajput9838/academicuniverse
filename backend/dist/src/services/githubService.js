"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const logger = new logger_1.Logger('githubService');
// In-memory cache for optimization
class ProjectCache {
    constructor() {
        this.cache = new Map();
        this.TTL = 5 * 60 * 1000; // 5 minutes cache
    }
    set(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    clear(key) {
        this.cache.delete(key);
    }
}
const projectCache = new ProjectCache();
class GitHubService {
    constructor() {
        this.apiBase = 'https://api.github.com';
        this.rateLimitPenalty = 30; // Wait X minutes for GitHub API quota renewal
        this.isRateLimitBackoffMode = false;
        // Don't throw error at construction time, check at runtime instead
        this.accessToken = process.env.GITHUB_TOKEN;
    }
    /**
     * Fetch user's GitHub repositories and calculate project statistics
     * @param githubUsername - GitHub username
     * @returns Project statistics object
     */
    async getProjectStats(githubUsername) {
        // Check if token is configured
        if (!this.accessToken) {
            throw new errors_1.ConfigurationError('GITHUB_TOKEN environment variable is required. Please configure your GitHub Personal Access Token.');
        }
        const cacheKey = `github:${githubUsername}`;
        const cached = projectCache.get(cacheKey);
        if (cached) {
            logger.info(`Returning cached GitHub data for user: ${githubUsername}`);
            return cached;
        }
        // Check rate limit backoff
        if (this.isRateLimitBackoffMode && this.backoffDeadline && new Date() < this.backoffDeadline) {
            throw new errors_1.ExternalAPIError('GitHub API rate limit exceeded. Please try again later.');
        }
        try {
            logger.info(`Fetching GitHub repositories for user: ${githubUsername}`);
            const response = await axios_1.default.get(`${this.apiBase}/users/${githubUsername}/repos`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Academic-Universe-App'
                },
                params: {
                    sort: 'updated',
                    direction: 'desc',
                    per_page: 100
                },
                timeout: 10000
            });
            const repositories = response.data;
            logger.info(`Found ${repositories.length} repositories for user: ${githubUsername}`);
            // Filter and classify repositories
            const nonForkRepos = repositories.filter((repo) => !repo.fork);
            let total = 0;
            let completed = 0;
            let ongoing = 0;
            for (const repo of nonForkRepos) {
                total++;
                // Check if repository has "completed" topic
                if (repo.topics && repo.topics.includes('completed')) {
                    completed++;
                }
                // Check if repository has "ongoing" topic
                else if (repo.topics && repo.topics.includes('ongoing')) {
                    ongoing++;
                }
            }
            const stats = {
                total,
                completed,
                ongoing
            };
            // Cache the results
            projectCache.set(cacheKey, stats);
            logger.info(`Project statistics calculated - Total: ${total}, Completed: ${completed}, Ongoing: ${ongoing}`);
            return stats;
        }
        catch (error) {
            logger.error(`Failed to fetch GitHub repositories for user ${githubUsername}:`, error);
            // Handle rate limiting
            if (error.response?.status === 403) {
                const resetTime = error.response?.headers?.['x-ratelimit-reset'];
                if (resetTime) {
                    const resetDate = new Date(resetTime * 1000);
                    this.isRateLimitBackoffMode = true;
                    this.backoffDeadline = resetDate;
                    logger.warn(`GitHub rate limit exceeded. Backoff until: ${resetDate}`);
                }
                else {
                    // Default backoff
                    this.isRateLimitBackoffMode = true;
                    this.backoffDeadline = new Date(Date.now() + this.rateLimitPenalty * 60 * 1000);
                }
                throw new errors_1.ExternalAPIError('GitHub API rate limit exceeded. Please try again later.');
            }
            // Handle user not found
            if (error.response?.status === 404) {
                throw new errors_1.ExternalAPIError(`GitHub user '${githubUsername}' not found`);
            }
            // Handle other GitHub API errors
            if (error.response) {
                throw new errors_1.ExternalAPIError(`GitHub API error: ${error.response.status} - ${error.response.statusText}`);
            }
            // Handle network errors
            throw new errors_1.ExternalAPIError('Failed to connect to GitHub API');
        }
    }
    /**
     * Clear cache for a specific user
     * @param githubUsername - GitHub username
     */
    clearUserCache(githubUsername) {
        const cacheKey = `github:${githubUsername}`;
        projectCache.clear(cacheKey);
        logger.info(`Cleared cache for user: ${githubUsername}`);
    }
    /**
     * Check if service is in rate limit backoff mode
     */
    isRateLimited() {
        if (!this.isRateLimitBackoffMode)
            return false;
        if (this.backoffDeadline && new Date() >= this.backoffDeadline) {
            this.isRateLimitBackoffMode = false;
            this.backoffDeadline = undefined;
            logger.info('Rate limit backoff period ended');
        }
        return this.isRateLimitBackoffMode;
    }
}
exports.default = new GitHubService();
