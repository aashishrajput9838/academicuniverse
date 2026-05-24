import { EzoneSessionProvider } from '../providers/ezone-session.provider';
import { EzoneRepository } from '../repositories/ezone.repository';
import { ProfileScraper } from '../scrapers/profile.scraper';
import { AttendanceScraper } from '../scrapers/attendance.scraper';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneService');

export class EzoneService {
    constructor(
        private sessionProvider: EzoneSessionProvider,
        private repository: EzoneRepository,
        private profileScraper: ProfileScraper,
        private attendanceScraper: AttendanceScraper
    ) {}

    async requestOtp(systemId: string): Promise<void> {
        await this.sessionProvider.triggerOtp(systemId);
    }

    async verifyAndSync(systemId: string, otp: string, userId: string, organizationId: string): Promise<any> {
        try {
            // 1. Verify OTP and get authenticated page
            await this.sessionProvider.verifyOtp(systemId, otp);
            const page = await this.sessionProvider.getAuthenticatedPage(systemId);

            // 2. Scrape data
            logger.info('Starting sync for user:', { userId });
            const profile = await this.profileScraper.scrape(page);
            const attendance = await this.attendanceScraper.scrape(page);

            // 3. Normalize and save to MongoDB
            const syncedData = {
                ...profile,
                ...attendance,
                lastSyncedAt: new Date(),
                syncStatus: 'SUCCESS' as const,
                rawSnapshot: { profile, attendance } // optional
            };

            const savedProfile = await this.repository.upsertProfile(userId, organizationId, syncedData);

            // 4. Cleanup session
            await this.sessionProvider.cleanupSession(systemId);

            return savedProfile;
        } catch (error: any) {
            logger.error('Sync failed:', error);
            await this.repository.updateSyncStatus(userId, organizationId, 'FAILED');
            throw error;
        }
    }

    async getProfile(userId: string, organizationId: string): Promise<any> {
        return await this.repository.findByUserId(userId, organizationId);
    }
}
