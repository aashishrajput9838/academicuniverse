import cron from 'node-cron';
import mongoose from 'mongoose';
import { User } from '../models';
import analyticsService from './analyticsService';
import { syncGmailEvents } from './gmailSyncService';
import { Logger } from '../utils/logger';

const logger = new Logger('schedulerService');

export class SchedulerService {
  private static instance: SchedulerService;
  private isRunning = false;

  private constructor() { }

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Starts the scheduled tasks
   * Runs GitHub analytics updates every 6 hours
   */
  public start(): void {
    if (this.isRunning) {
      logger.info('Scheduler already running');
      return;
    }

    logger.info('Starting scheduler service...');

    // Schedule GitHub analytics updates every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      try {
        logger.info('Running scheduled GitHub analytics updates...');
        await this.updateAllUsersGitHubAnalytics();
      } catch (error) {
        logger.error('Scheduled GitHub analytics failed:', error);
      }
    });

    // Schedule Gmail events updates every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      try {
        logger.info('Running scheduled Gmail events sync...');
        await this.syncAllUsersGmailEvents();
      } catch (error) {
        logger.error('Scheduled Gmail sync failed:', error);
      }
    });

    this.isRunning = true;
    logger.info('Scheduler started successfully');
  }

  /**
   * Updates GitHub analytics for all users who have connected their GitHub accounts
   */
  private async updateAllUsersGitHubAnalytics(): Promise<void> {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        logger.warn('MongoDB not connected, skipping GitHub analytics update');
        return;
      }

      // Find all users who have GitHub access tokens (using lean + projection)
      const users = await User.find({
        'githubAccessToken.encryptedToken': { $exists: true, $ne: null }
      }).select('_id firebaseUid email').lean().exec();

      logger.info(`Found ${users.length} users with connected GitHub accounts`);

      for (const user of users) {
        try {
          const userEmail = user.email ? user.email : user._id.toString();
          logger.info(`Updating GitHub analytics for user: ${userEmail}`);

          if (user.firebaseUid) {
            const stats = await analyticsService.syncGithubData(user.firebaseUid);
            logger.info(`GitHub sync completed for user: ${userEmail}`, stats);
          }

          // Update the user's developer stats in the database
          // For now, we'll store them in the user record or in a separate collection
          // In a real implementation, you'd likely have a dedicated analytics collection

          logger.info(`Successfully updated GitHub analytics for user: ${userEmail}`);
        } catch (error: any) {
          const userEmail = user.email ? user.email : user._id.toString();
          logger.error(`Failed to update GitHub analytics for user ${userEmail}:`, error.message);
          // Continue with other users even if one fails
        }
      }
    } catch (error: any) {
      logger.error('Error updating all users GitHub analytics:', error.message);
    }
  }

  /**
   * Syncs Gmail events for all users who have connected their Gmail accounts
   */
  private async syncAllUsersGmailEvents(): Promise<void> {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        logger.warn('MongoDB not connected, skipping Gmail sync');
        return;
      }

      // Find all users who have Gmail access tokens (using lean + projection)
      const users = await User.find({
        $or: [
          { 'gmailTokens.accessToken': { $exists: true, $ne: '' } },
          { 'gmailTokens.encryptedToken': { $exists: true, $ne: null } },
        ]
      }).select('_id firebaseUid email').lean().exec();

      logger.info(`Found ${users.length} users with connected Gmail accounts`);

      for (const user of users) {
        try {
          const userIdStr = user._id.toString();
          logger.info(`Syncing Gmail events for user: ${userIdStr}`);

          await syncGmailEvents(userIdStr);

          logger.info(`Successfully synced Gmail events for user: ${userIdStr}`);
        } catch (error: any) {
          logger.error(`Failed to sync Gmail events for user ${user._id}:`, error.message);
        }
      }
    } catch (error: any) {
      logger.error('Error syncing all users Gmail events:', error.message);
    }
  }

  /**
   * Stops the scheduler
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    // Stop all cron jobs
    const tasks = cron.getTasks();
    for (const task of tasks.values()) {
      task.stop();
    }

    this.isRunning = false;
    logger.info('Scheduler stopped');
  }
}

// Export singleton instance
export default SchedulerService.getInstance();