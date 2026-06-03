import { EzoneRepository } from '../repositories/ezone.repository';
import { EzoneScraper } from '../scrapers/ezone.scraper';
import { EzoneSessionProvider } from '../providers/ezone-session.provider';
import { EzoneLogger } from './ezone-logger.service';
import { Logger } from '../../../shared/utils';
import { IEzoneAcademicProfile } from '../../../models/EzoneAcademicProfile';

const logger = new Logger('EzoneService');
const ezoneLogger = EzoneLogger.getInstance();

export class EzoneService {
    constructor(
        private sessionProvider: EzoneSessionProvider,
        private repository: EzoneRepository,
        private scraper: EzoneScraper
    ) {}

    /**
     * Step 1: Request OTP from university portal
     */
    async requestOtp(systemId: string, userId: string, organizationId: string, firebaseUid?: string): Promise<string> {
        await ezoneLogger.clearLogs(systemId);
        return await this.sessionProvider.triggerOtp(systemId, userId, organizationId, firebaseUid);
    }

    /**
     * Step 2: Verify OTP and Sync Academic Data
     */
    async verifyAndSync(sessionId: string, systemId: string, otp: string, userId: string, organizationId: string, firebaseUid?: string): Promise<IEzoneAcademicProfile> {
        try {
            // 1. Verify OTP and get authenticated page
            await this.sessionProvider.verifyOtp(sessionId, otp, userId, organizationId, firebaseUid);
            const page = await this.sessionProvider.getAuthenticatedPage(sessionId);

            // 2. Extract academic data
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'OTP verified. Extracting academic profile and attendance...', null, firebaseUid);
            const extractedData = await this.scraper.extractData(page);
            
            // 3. Log extracted values (requirement)
            logger.info('[EZONE] Extracted Data:', extractedData);

            // 4. Save to MongoDB
            const savedProfile = await this.repository.upsertProfile(userId, organizationId, {
                ...extractedData,
                lastSyncedAt: new Date()
            });

            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'success', 'Academic data sync completed successfully!', null, firebaseUid);

            // 5. Cleanup session
            await this.sessionProvider.cleanupSession(sessionId);

            return savedProfile;
        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', `Sync failed: ${error.message}`, null, firebaseUid);
            logger.error('Sync process failed:', error);
            throw error;
        }
    }

    /**
     * Get stored profile
     */
    async getProfile(userId: string, organizationId: string): Promise<IEzoneAcademicProfile | null> {
        return await this.repository.findByUserId(userId, organizationId);
    }
}
