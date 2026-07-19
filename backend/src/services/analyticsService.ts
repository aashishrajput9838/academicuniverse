import axios from 'axios';
import { User } from '../models';
import { Logger } from '../utils/logger';
import getGithubOAuthService from './githubOAuthService';
import { eventBus } from '../events/EventBus';
import { UaipEvent } from '../events/UaipEvents';
import { GithubRecord } from '../models/GithubRecord';
import { PersonResolver } from '../shared/services/personResolver.service';
import { toObjectId } from '../utils/mongooseHelpers';

const logger = new Logger('analyticsService');

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  fork: boolean;
  html_url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  size: number;
  language: string | null;
  forks_count: number;
  stargazers_count: number;
  watchers_count: number;
  topics: string[];
}

interface LanguageData {
  [key: string]: number;
}

interface DeveloperStats {
  totalRepos: number;
  totalPrivateRepos: number;
  totalPublicRepos: number;
  topLanguage: string | null;
  languageDistribution: Record<string, number>;
  totalCommits: number;
  lastActiveDate: string | null;
  repoGrowthTrend: number;
  avgRepoSize: number;
  totalStars: number;
  totalForks: number;
  totalWatchers: number;
  primaryLanguageRepos: number;
  updated_at: Date;
}

export class AnalyticsService {
  /**
   * Fetches GitHub data for a user and processes analytics
   * @param firebaseUid The Firebase UID of the user
   * @returns Processed developer statistics
   */
  async processDeveloperAnalytics(firebaseUid: string): Promise<DeveloperStats> {
    try {
      logger.info(`Processing developer analytics for user: ${firebaseUid}`);

      // Get the user's GitHub access token
      const githubOAuthService = getGithubOAuthService();
      const accessToken = await githubOAuthService.getAccessToken(firebaseUid);

      // Fetch user's repositories
      const repositories = await this.fetchUserRepositories(accessToken);

      // Process analytics
      const analytics = this.calculateDeveloperStats(repositories);

      logger.info(`Analytics processed for user: ${firebaseUid}`, analytics);

      return analytics;
    } catch (error: any) {
      logger.error('Error processing developer analytics:', error.message);
      throw new Error(`Failed to process developer analytics: ${error.message}`);
    }
  }

  /**
   * Fetches GitHub data, persists GithubRecord, and publishes GithubUpdated event.
   * This is the canonical sync method used by the scheduler and manual sync endpoint.
   * @param firebaseUid The Firebase UID of the user
   * @returns Sync summary with stats and skill creation info
   */
  async syncGithubData(firebaseUid: string): Promise<{
    repositoriesFetched: number;
    languagesExtracted: number;
    skillsCreated: number;
    projectionsRebuilt: number;
  }> {
    try {
      logger.info(`Syncing GitHub data for user: ${firebaseUid}`);

      const githubOAuthService = getGithubOAuthService();
      const accessToken = await githubOAuthService.getAccessToken(firebaseUid);

      const repositories = await this.fetchUserRepositories(accessToken);
      const analytics = this.calculateDeveloperStats(repositories);

      const user = await User.findOne({ firebaseUid }).select('organizationId githubUsername name email').lean();
      if (!user) {
        throw new Error('User not found');
      }

      const organizationId = user.organizationId instanceof require('mongoose').Types.ObjectId
        ? user.organizationId
        : toObjectId(String(user.organizationId));

      const personResolver = new PersonResolver();
      const personId = await personResolver.resolve(
        user._id.toString(),
        organizationId.toString(),
        user.email,
        user.name
      );

      const nonForkRepos = repositories.filter((repo: Repository) => !repo.fork);
      const languages: Record<string, number> = {};
      const contributions: Record<string, number> = {};

      for (const repo of nonForkRepos) {
        if (repo.language) {
          languages[repo.language] = (languages[repo.language] || 0) + 1;
        }
        if (repo.topics) {
          for (const topic of repo.topics) {
            contributions[topic] = (contributions[topic] || 0) + 1;
          }
        }
      }

      const githubRecord = await GithubRecord.findOneAndUpdate(
        { organizationId, personId: toObjectId(personId) },
        {
          $set: {
            githubUsername: user.githubUsername,
            repositories: nonForkRepos,
            languages,
            contributions,
            rawConfidence: 0.9,
          },
        },
        { upsert: true, new: true }
      );

      logger.info(`GithubRecord persisted for user: ${firebaseUid}`, {
        recordId: githubRecord._id.toString(),
        repoCount: nonForkRepos.length,
        languageCount: Object.keys(languages).length,
      });

      const languagesExtracted = Object.keys(languages).length;

      await eventBus.publish(UaipEvent.GithubUpdated, {
        processingId: `github-sync-${personId.toString()}-${Date.now()}`,
        organizationId: organizationId.toString(),
        personId: personId.toString(),
        correlationId: githubRecord._id.toString(),
        eventId: githubRecord._id.toString(),
        occurredAt: new Date(),
        source: 'github',
        repositories: nonForkRepos,
        languages,
        contributions,
      });

      logger.info(`GithubUpdated event published for user: ${firebaseUid}`);

      return {
        repositoriesFetched: nonForkRepos.length,
        languagesExtracted,
        skillsCreated: languagesExtracted,
        projectionsRebuilt: 1,
      };
    } catch (error: any) {
      logger.error(`Error syncing GitHub data for user ${firebaseUid}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetches user repositories from GitHub
   * @param accessToken The GitHub access token
   * @returns Array of user repositories
   */
  private async fetchUserRepositories(accessToken: string): Promise<Repository[]> {
    try {
      const response = await axios.get<Repository[]>(
        'https://api.github.com/user/repos',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Academic-Universe-App'
          },
          params: {
            type: 'all', // Include public, private, and owned repos
            sort: 'updated',
            per_page: 100 // Maximum allowed per page
          }
        }
      );

      // GitHub paginates results, so we need to fetch all pages
      let repos = [...response.data];
      let nextPageUrl = this.getNextPageUrl(response.headers.link);

      while (nextPageUrl) {
        const nextPageResponse = await axios.get<Repository[]>(nextPageUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Academic-Universe-App'
          }
        });

        repos = [...repos, ...nextPageResponse.data];
        nextPageUrl = this.getNextPageUrl(nextPageResponse.headers.link);
      }

      logger.info(`Fetched ${repos.length} repositories from GitHub`);
      return repos;
    } catch (error: any) {
      logger.error('Error fetching repositories:', error.message);
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }

  /**
   * Extracts next page URL from GitHub API response headers
   * @param linkHeader The link header from GitHub API response
   * @returns Next page URL or null if no next page
   */
  private getNextPageUrl(linkHeader: string | undefined): string | null {
    if (!linkHeader) return null;

    const links = linkHeader.split(',');
    for (const link of links) {
      if (link.includes('rel="next"')) {
        const match = link.match(/<(.+?)>; rel="next"/);
        return match ? match[1] : null;
      }
    }

    return null;
  }

  /**
   * Calculates developer statistics from repository data
   * @param repositories Array of user repositories
   * @returns Calculated developer statistics
   */
  private calculateDeveloperStats(repositories: Repository[]): DeveloperStats {
    // Filter out forked repositories
    const ownRepos = repositories.filter(repo => !repo.fork);

    // Calculate basic metrics
    const totalRepos = ownRepos.length;
    const totalPrivateRepos = ownRepos.filter(repo => repo.private).length;
    const totalPublicRepos = totalRepos - totalPrivateRepos;

    // Calculate language distribution
    const languageCounts: LanguageData = {};
    for (const repo of ownRepos) {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    }

    // Determine top language
    let topLanguage: string | null = null;
    let maxCount = 0;
    for (const [lang, count] of Object.entries(languageCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topLanguage = lang;
      }
    }

    // Calculate total stars, forks, and watchers
    const totalStars = ownRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const totalForks = ownRepos.reduce((sum, repo) => sum + repo.forks_count, 0);
    const totalWatchers = ownRepos.reduce((sum, repo) => sum + repo.watchers_count, 0);

    // Calculate average repo size
    const avgRepoSize = totalRepos > 0 
      ? ownRepos.reduce((sum, repo) => sum + repo.size, 0) / totalRepos 
      : 0;

    // Calculate primary language repos (repos using top language)
    const primaryLanguageRepos = topLanguage 
      ? ownRepos.filter(repo => repo.language === topLanguage).length 
      : 0;

    // Calculate last active date (most recent update)
    const lastActiveDate = ownRepos.length > 0
      ? ownRepos.reduce((latest, repo) => {
          const repoDate = new Date(repo.updated_at);
          return repoDate > latest ? repoDate : latest;
        }, new Date(0)).toISOString()
      : null;

    // Calculate repo growth trend (simplified as average age)
    let repoGrowthTrend = 0;
    if (ownRepos.length > 1) {
      const oldestRepo = ownRepos.reduce((oldest, repo) => {
        const repoDate = new Date(repo.created_at);
        return repoDate < oldest ? repoDate : oldest;
      }, new Date()).getTime();

      const newestRepo = ownRepos.reduce((newest, repo) => {
        const repoDate = new Date(repo.created_at);
        return repoDate > newest ? repoDate : newest;
      }, new Date(0)).getTime();

      // Calculate repos per day as a simple growth metric
      const daysDiff = (newestRepo - oldestRepo) / (1000 * 60 * 60 * 24);
      repoGrowthTrend = daysDiff > 0 ? totalRepos / daysDiff : 0;
    }

    // Placeholder for total commits (GitHub doesn't provide this easily)
    // This would require fetching each repo's commit history, which is expensive
    // For now, we'll set it to 0 and consider alternative approaches
    const totalCommits = 0;

    return {
      totalRepos,
      totalPrivateRepos,
      totalPublicRepos,
      topLanguage,
      languageDistribution: languageCounts,
      totalCommits,
      lastActiveDate,
      repoGrowthTrend,
      avgRepoSize,
      totalStars,
      totalForks,
      totalWatchers,
      primaryLanguageRepos,
      updated_at: new Date()
    };
  }

  /**
   * Fetches commit count for a repository (this is expensive and would need optimization)
   * @param accessToken GitHub access token
   * @param owner Repository owner
   * @param repo Repository name
   * @returns Commit count
   */
  async fetchCommitCount(accessToken: string, owner: string, repo: string): Promise<number> {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/commits`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Academic-Universe-App'
          },
          params: {
            per_page: 1 // Just get one page to count commits
          }
        }
      );

      // GitHub API returns Link header for pagination which contains total count
      const linkHeader = response.headers.link;
      if (linkHeader) {
        // Extract total pages from the last page link
        const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (lastPageMatch) {
          return parseInt(lastPageMatch[1]) * 100; // Assuming 100 per page
        }
      }

      // If no pagination info, return the number of commits in the first page
      return response.data.length;
    } catch (error: any) {
      logger.error(`Error fetching commit count for ${owner}/${repo}:`, error.message);
      return 0;
    }
  }
}

export default new AnalyticsService();