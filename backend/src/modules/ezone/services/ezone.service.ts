import { EzoneRepository } from '../repositories/ezone.repository';
import { EzoneScraper } from '../scrapers/ezone.scraper';
import { EzoneExplorer } from '../scrapers/ezone.explorer';
import { EzoneSessionProvider } from '../providers/ezone-session.provider';
import { EzoneLogger } from './ezone-logger.service';
import { Logger } from '../../../shared/utils';
import { IEzoneAcademicProfile } from '../../../models/EzoneAcademicProfile';

const logger = new Logger('EzoneService');
const ezoneLogger = EzoneLogger.getInstance();

export class EzoneService {
    private explorer = new EzoneExplorer();

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
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Starting primary data extraction...', { category: 'EXTRACTION', progress: 0 }, firebaseUid);
            const extractedData = await this.scraper.extractData(page, userId, organizationId, sessionId, firebaseUid);
            
            // 3. Validation Layer
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'info', 'Validating extracted intelligence...', { category: 'EXTRACTION', progress: 80 }, firebaseUid);
            this.validateExtractedData(extractedData);

            // 4. Log extracted values
            logger.info('[EZONE] Final Sync Data:', extractedData);

            // 5. Save to MongoDB
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Persisting profile to Academic Universe Database...', { category: 'DATABASE', actionType: 'mongodb.save', progress: 50 }, firebaseUid);
            const savedProfile = await this.repository.upsertProfile(userId, organizationId, {
                ...extractedData,
                lastSyncedAt: new Date()
            });

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'success', 'Academic data sync completed successfully!', { category: 'DATABASE', progress: 100 }, firebaseUid);

            // 6. EXPLORER MODE: Discover other modules in the background
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'info', 'Launching Discovery Mode to identify available data modules...', { category: 'DISCOVERY', progress: 0 }, firebaseUid);
            this.explorer.explore(page, userId, organizationId, sessionId, firebaseUid).catch(err => {
                logger.error('Explorer Mode failed in background:', err);
            });

            // 7. Cleanup session (We don't wait for explorer to finish since it uses the same page)
            // Note: If explorer needs the page, we should cleanup after explorer finishes.
            // For now, let's keep session open for 2 mins longer for exploration.
            setTimeout(() => this.sessionProvider.cleanupSession(sessionId), 2 * 60 * 1000);

            return savedProfile;
        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'error', `Sync failed: ${error.message}`, { category: 'GENERAL', status: 'failed', progress: 0 }, firebaseUid);
            logger.error('Sync process failed:', error);
            throw error;
        }
    }

    /**
     * Validate extracted data before database save
     */
    private validateExtractedData(data: any): void {
        const { studentName, systemId, caMarks, timetable, holidays } = data;

        // 1. Core Profile Validation
        if (!studentName || studentName === 'N/A') {
            throw new Error('Student name not found in university portal.');
        }

        if (!systemId || systemId === 'N/A') {
            throw new Error('System ID not found in university portal.');
        }

        // 2. Strict Technical Leak Prevention
        const suspiciousTerms = [
            '.apexcharts', 'iframe', 'script', 'style', 'translateY(', 
            'display:flex', 'position:absolute', 'fill:', 'stroke:',
            'data-v-', 'ng-content', 'react-root', '<script', '<style'
        ];

        const checkValue = (val: any) => {
            if (typeof val === 'string') {
                if (suspiciousTerms.some(term => val.toLowerCase().includes(term.toLowerCase()))) {
                    throw new Error(`Security Alert: Extracted data contains forbidden technical fragments: "${val.substring(0, 50)}..."`);
                }
                if (val.includes('<') || val.includes('>')) {
                    throw new Error(`Security Alert: HTML tags detected in extracted data: "${val.substring(0, 50)}..."`);
                }
            } else if (Array.isArray(val)) {
                val.forEach(item => checkValue(item));
            } else if (typeof val === 'object' && val !== null) {
                Object.values(val).forEach(v => checkValue(v));
            }
        };

        // Validate all extracted fields recursively
        checkValue(data);

        // 3. Blacklist Terms Validation (e.g. from previous logic)
        const blacklistedTerms = ["Holiday's", "iframe", "script", "GoogleTagManager"];
        if (blacklistedTerms.some(term => studentName.includes(term))) {
            throw new Error(`Data extraction blocked: "${studentName}" contains blacklisted terms.`);
        }
    }

    /**
     * Get stored profile
     */
    async getProfile(userId: string, organizationId: string): Promise<IEzoneAcademicProfile | null> {
        return await this.repository.findByUserId(userId, organizationId);
    }
}
