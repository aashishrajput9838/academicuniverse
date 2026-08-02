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
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Starting primary data extraction...', { category: 'EXTRACTION', progress: 30 }, firebaseUid);
            const extractedData = await this.scraper.extractData(page, userId, organizationId, sessionId, firebaseUid);

            // 3. Save to MongoDB
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Persisting profile to Academic Universe Database...', { category: 'DATABASE', actionType: 'mongodb.save', progress: 80 }, firebaseUid);
            const savedProfile = await this.repository.upsertProfile(userId, organizationId, {
                ...extractedData,
                lastSyncedAt: new Date()
            });

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'success', 'Academic data sync completed successfully!', { category: 'DATABASE', progress: 100 }, firebaseUid);

            // Cleanup session cleanly after database save completes
            await this.sessionProvider.cleanupSession(sessionId);

            return savedProfile;
        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'error', `Sync failed: ${error.message}`, { category: 'GENERAL', status: 'failed', progress: 0 }, firebaseUid);
            logger.error('Sync process failed:', error);
            
            // Ensure session cleanup on failure
            try {
                await this.sessionProvider.cleanupSession(sessionId);
            } catch (cleanupErr: any) {
                logger.warn(`Error during session cleanup after failure: ${cleanupErr.message}`);
            }

            throw error;
        }
    }

    /**
     * Get profile from MongoDB
     */
    async getProfile(userId: string, organizationId: string): Promise<IEzoneAcademicProfile | null> {
        return await this.repository.findByUserId(userId, organizationId);
    }
}
