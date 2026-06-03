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
            
            // 3. Validation Layer (Requirement 4 & 5)
            this.validateExtractedData(extractedData);

            // 4. Log extracted values (Requirement 6)
            logger.info('[EZONE] Final Sync Data:', {
                studentName: extractedData.studentName,
                systemId: extractedData.systemId,
                attendance: extractedData.attendancePercentage,
                present: extractedData.presentClasses,
                absent: extractedData.absentClasses,
                total: extractedData.totalClasses
            });

            // 5. Save to MongoDB
            const savedProfile = await this.repository.upsertProfile(userId, organizationId, {
                ...extractedData,
                lastSyncedAt: new Date()
            });

            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'success', 'Academic data sync completed successfully!', null, firebaseUid);

            // 6. Cleanup session
            await this.sessionProvider.cleanupSession(sessionId);

            return savedProfile;
        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', `Sync failed: ${error.message}`, null, firebaseUid);
            logger.error('Sync process failed:', error);
            throw error;
        }
    }

    /**
     * Validate extracted data before database save
     */
    private validateExtractedData(data: any): void {
        const { studentName, presentClasses, totalClasses } = data;

        // 1. Student Name Validation (Requirement 4)
        if (!studentName || !/[a-zA-Z]/.test(studentName)) {
            throw new Error('Invalid student name extracted. Data may be corrupted.');
        }

        const blacklistedNames = ["Holiday's", "iframe", "script", "GoogleTagManager", "Welcome"];
        if (blacklistedNames.some(name => studentName.includes(name))) {
            throw new Error(`Data extraction blocked by security policy: ${studentName}`);
        }

        // 2. Attendance Validation (Requirement 5)
        if (presentClasses === 0 && totalClasses > 0) {
            throw new Error('Extraction failure: Attendance summary returned 0 present classes while total is non-zero.');
        }

        // 3. HTML Injection Prevention
        const rawValues = Object.values(data);
        if (rawValues.some(val => typeof val === 'string' && (val.includes('<') || val.includes('>')))) {
            throw new Error('Extraction blocked: Detected HTML tags in profile data.');
        }
    }

    /**
     * Get stored profile
     */
    async getProfile(userId: string, organizationId: string): Promise<IEzoneAcademicProfile | null> {
        return await this.repository.findByUserId(userId, organizationId);
    }
}
