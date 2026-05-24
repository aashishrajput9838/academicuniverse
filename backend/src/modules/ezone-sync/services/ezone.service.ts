import { EzoneSessionProvider } from '../providers/ezone-session.provider';
import { EzoneRepository } from '../repositories/ezone.repository';
import { ProfileScraper } from '../scrapers/profile.scraper';
import { AttendanceScraper } from '../scrapers/attendance.scraper';
import { EzoneLogger } from '../services/ezone-logger.service';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneService');
const ezoneLogger = EzoneLogger.getInstance();

export class EzoneService {
    constructor(
        private sessionProvider: EzoneSessionProvider,
        private repository: EzoneRepository,
        private profileScraper: ProfileScraper,
        private attendanceScraper: AttendanceScraper
    ) {}

    async requestOtp(systemId: string, userId: string, organizationId: string): Promise<void> {
        await ezoneLogger.clearLogs(systemId);
        await this.sessionProvider.triggerOtp(systemId, userId, organizationId);
    }

    async verifyAndSync(systemId: string, otp: string, userId: string, organizationId: string): Promise<any> {
        try {
            // 1. Verify OTP and get authenticated page
            await this.sessionProvider.verifyOtp(systemId, otp, userId, organizationId);
            const page = await this.sessionProvider.getAuthenticatedPage(systemId);

            // 2. Scrape data
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Initiating academic data extraction...');
            logger.info('Starting sync for user:', { userId });
            
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Fetching student profile details...');
            const profile = await this.profileScraper.scrape(page);
            
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Fetching attendance and subject records...');
            const attendance = await this.attendanceScraper.scrape(page);

            // 3. Normalize and save to MongoDB
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Normalizing and saving data to Academic Universe...');
            const syncedData = {
                ...profile,
                ...attendance,
                lastSyncedAt: new Date(),
                syncStatus: 'SUCCESS' as const,
                rawSnapshot: { profile, attendance } // optional
            };

            const savedProfile = await this.repository.upsertProfile(userId, organizationId, syncedData);
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'success', 'Sync completed successfully! Dashboard updated.');

            // 4. Cleanup session
            await this.sessionProvider.cleanupSession(systemId);

            return savedProfile;
        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', `Sync process failed: ${error.message}`);
            logger.error('Sync failed:', error);
            await this.repository.updateSyncStatus(userId, organizationId, 'FAILED');
            throw error;
        }
    }

    async getProfile(userId: string, organizationId: string): Promise<any> {
        return await this.repository.findByUserId(userId, organizationId);
    }
}
