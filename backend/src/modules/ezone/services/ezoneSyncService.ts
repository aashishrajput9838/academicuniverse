import { EzoneRepository } from '../repositories/ezone.repository';
import { EzoneScraper } from '../scrapers/ezone.scraper';
import { EzoneSessionProvider } from '../providers/ezone-session.provider';
import { GoogleSheetsService } from './googleSheetsService';
import { EzoneDataMapper } from './ezoneDataMapper';
import { EzoneDataValidator } from './ezoneDataValidator';
import { EzoneLogger } from './ezone-logger.service';
import { Logger } from '../../../shared/utils';
import { IEzoneAcademicProfile } from '../../../models/EzoneAcademicProfile';

const logger = new Logger('EzoneSyncService');
const ezoneLogger = EzoneLogger.getInstance();

export class EzoneSyncService {
    private googleSheets = GoogleSheetsService.getInstance();
    private mapper = EzoneDataMapper.getInstance();
    private validator = EzoneDataValidator.getInstance();

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
     * Step 2: Verify OTP and Sync Academic Data through the new pipeline
     */
    async verifyAndSync(sessionId: string, systemId: string, otp: string, userId: string, organizationId: string, firebaseUid?: string): Promise<IEzoneAcademicProfile> {
        try {
            if (this.googleSheets.isEnabled()) {
                await this.googleSheets.logSync('SYNC_STARTED', 'PENDING', `Starting sync for user ${userId}`);
            }

            // 1. Verify OTP and get authenticated page
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Verifying OTP...', { category: 'AUTH', progress: 10 }, firebaseUid);
            await this.sessionProvider.verifyOtp(sessionId, otp, userId, organizationId, firebaseUid);
            const page = await this.sessionProvider.getAuthenticatedPage(sessionId);
            if (this.googleSheets.isEnabled()) {
                await this.googleSheets.logSync('OTP_VERIFIED', 'SUCCESS', 'User identity verified');
            }

            // 2. Extract academic data using Playwright
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Extracting academic data from Ezone...', { category: 'EXTRACTION', progress: 30 }, firebaseUid);
            const rawExtractedData = await this.scraper.extractData(page, userId, organizationId, sessionId, firebaseUid);
            if (this.googleSheets.isEnabled()) {
                await this.googleSheets.logSync('DATA_EXTRACTED', 'SUCCESS', 'Raw data extracted from Ezone');
            }

            // 3. Sanitize and Validate
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'info', 'Sanitizing and validating data...', { category: 'VALIDATION', progress: 50 }, firebaseUid);
            
            // Apply sanitization to all string fields
            const sanitizeObject = (obj: any): any => {
                if (typeof obj === 'string') return this.mapper.sanitize(obj);
                if (Array.isArray(obj)) return obj.map(sanitizeObject);
                if (typeof obj === 'object' && obj !== null) {
                    const newObj: any = {};
                    for (const key in obj) {
                        newObj[key] = sanitizeObject(obj[key]);
                    }
                    return newObj;
                }
                return obj;
            };

            const sanitizedData = sanitizeObject(rawExtractedData);
            this.validator.validate(sanitizedData);
            if (this.googleSheets.isEnabled()) {
                await this.googleSheets.logSync('DATA_VALIDATED', 'SUCCESS', 'Data sanitized and validated (No HTML/CSS/JS)');
            }

            // 4. Save to Google Sheets (if enabled)
            let sheetsData: Record<string, any[][]> | null = null;
            if (this.googleSheets.isEnabled()) {
                await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Archiving data to Google Sheets...', { category: 'SHEETS', progress: 70 }, firebaseUid);
                sheetsData = this.mapper.toSheets(sanitizedData, systemId, userId, organizationId);
                
                for (const [sheetName, rows] of Object.entries(sheetsData)) {
                    if (rows && rows.length > 0) {
                        await this.googleSheets.appendRows(sheetName, rows);
                    }
                }
                await this.googleSheets.logSync('SHEETS_UPDATED', 'SUCCESS', 'Structured data saved to Google Sheets');
            }

            // 5. Prepare data for MongoDB
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'info', 'Syncing clean data to MongoDB...', { category: 'DATABASE', progress: 90 }, firebaseUid);
            
            let mongoData;
            if (sheetsData) {
                mongoData = this.mapper.fromSheetsToMongo(sheetsData);
            } else {
                // Use sanitized data directly if Google Sheets is disabled
                mongoData = sanitizedData;
            }

            // 6. Store clean data into MongoDB
            const savedProfile = await this.repository.upsertProfile(userId, organizationId, mongoData);
            if (this.googleSheets.isEnabled()) {
                await this.googleSheets.logSync('MONGODB_UPDATED', 'SUCCESS', 'Clean data persisted to MongoDB');
            }

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'success', 'Academic data pipeline completed!', { category: 'DATABASE', progress: 100 }, firebaseUid);

            // Cleanup session immediately
            await this.sessionProvider.cleanupSession(sessionId);

            return savedProfile;
        } catch (error: any) {
            if (this.googleSheets.isEnabled()) {
                await this.googleSheets.logSync('SYNC_FAILED', 'FAILED', error.message);
            }
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'error', `Pipeline failed: ${error.message}`, { category: 'GENERAL', status: 'failed', progress: 0 }, firebaseUid);
            logger.error('Sync pipeline failed:', error);
            
            // Cleanup session on error too!
            try {
                await this.sessionProvider.cleanupSession(sessionId);
            } catch (cleanupErr) {
                logger.error('Error cleaning up session after failure:', cleanupErr);
            }
            
            throw error;
        }
    }

    /**
     * Get stored profile from MongoDB
     */
    async getProfile(userId: string, organizationId: string): Promise<IEzoneAcademicProfile | null> {
        return await this.repository.findByUserId(userId, organizationId);
    }
}
