"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const models_1 = require("../models");
const analyticsService_1 = __importDefault(require("./analyticsService"));
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('schedulerService');
class SchedulerService {
    constructor() {
        this.isRunning = false;
    }
    static getInstance() {
        if (!SchedulerService.instance) {
            SchedulerService.instance = new SchedulerService();
        }
        return SchedulerService.instance;
    }
    /**
     * Starts the scheduled tasks
     * Runs GitHub analytics updates every 6 hours
     */
    start() {
        if (this.isRunning) {
            logger.info('Scheduler already running');
            return;
        }
        logger.info('Starting scheduler service...');
        // Schedule GitHub analytics updates every 6 hours
        node_cron_1.default.schedule('0 */6 * * *', async () => {
            logger.info('Running scheduled GitHub analytics updates...');
            await this.updateAllUsersGitHubAnalytics();
        });
        // Also run once when the service starts
        setTimeout(async () => {
            await this.updateAllUsersGitHubAnalytics();
        }, 5000); // Run first update after 5 seconds
        this.isRunning = true;
        logger.info('Scheduler started successfully');
    }
    /**
     * Updates GitHub analytics for all users who have connected their GitHub accounts
     */
    async updateAllUsersGitHubAnalytics() {
        try {
            // Find all users who have GitHub access tokens
            const users = await models_1.User.find({
                'githubAccessToken.encryptedToken': { $exists: true, $ne: null }
            });
            logger.info(`Found ${users.length} users with connected GitHub accounts`);
            for (const user of users) {
                try {
                    const userEmail = user.email ? user.email : user._id.toString();
                    logger.info(`Updating GitHub analytics for user: ${userEmail}`);
                    if (user.firebaseUid) {
                        const stats = await analyticsService_1.default.processDeveloperAnalytics(user.firebaseUid);
                    }
                    // Update the user's developer stats in the database
                    // For now, we'll store them in the user record or in a separate collection
                    // In a real implementation, you'd likely have a dedicated analytics collection
                    logger.info(`Successfully updated GitHub analytics for user: ${userEmail}`);
                }
                catch (error) {
                    const userEmail = user.email ? user.email : user._id.toString();
                    logger.error(`Failed to update GitHub analytics for user ${userEmail}:`, error.message);
                    // Continue with other users even if one fails
                }
            }
        }
        catch (error) {
            logger.error('Error updating all users GitHub analytics:', error.message);
        }
    }
    /**
     * Stops the scheduler
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        // Stop all cron jobs
        const tasks = node_cron_1.default.getTasks();
        for (const task of tasks.values()) {
            task.stop();
        }
        this.isRunning = false;
        logger.info('Scheduler stopped');
    }
}
exports.SchedulerService = SchedulerService;
// Export singleton instance
exports.default = SchedulerService.getInstance();
