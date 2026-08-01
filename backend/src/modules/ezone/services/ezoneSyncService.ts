import { EzoneRepository } from '../repositories/ezone.repository';
import { EzoneScraper } from '../scrapers/ezone.scraper';
import { EzoneSessionProvider } from '../providers/ezone-session.provider';
import { GoogleSheetsService } from './googleSheetsService';
import { EzoneDataMapper } from './ezoneDataMapper';
import { EzoneDataValidator } from './ezoneDataValidator';
import { EzoneLogger } from './ezone-logger.service';
import { EzoneAcademicScheduleSyncService } from './ezoneAcademicScheduleSync.service';
import { Logger } from '../../../shared/utils';
import { IEzoneAcademicProfile } from '../../../models/EzoneAcademicProfile';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('EzoneSyncService');
const ezoneLogger = EzoneLogger.getInstance();

export class EzoneSyncService {
    private googleSheets = GoogleSheetsService.getInstance();
    private mapper = EzoneDataMapper.getInstance();
    private validator = EzoneDataValidator.getInstance();
    private academicScheduleSync = new EzoneAcademicScheduleSyncService();

    constructor(
        private sessionProvider: EzoneSessionProvider,
        private repository: EzoneRepository,
        private scraper: EzoneScraper
    ) {}

    private async discoverNavigationUrls(page: any): Promise<Record<string, string>> {
        return await page.evaluate(() => {
            const urls: Record<string, string> = {};
            const keywords: Record<string, string[]> = {
                attendance: ['attendance', 'attend'],
                marks: ['marks', 'grade', 'result', 'ca marks'],
                timetable: ['timetable', 'schedule', 'time table'],
                subjects: ['subjects', 'course', 'syllabus']
            };

            document.querySelectorAll('a[href]').forEach((a) => {
                const href = (a as HTMLAnchorElement).href || '';
                const text = (a.textContent || '').trim().toLowerCase();

                for (const [key, terms] of Object.entries(keywords)) {
                    if (terms.some(term => text.includes(term) || href.includes(term))) {
                        urls[key] = href;
                        break;
                    }
                }
            });

            return urls;
        });
    }

    private async captureDiagnosticPages(page: any, outputDir: string): Promise<void> {
        const navigationUrls = await this.discoverNavigationUrls(page);
        logger.info(`[DIAGNOSTIC] Discovered navigation URLs: ${JSON.stringify(navigationUrls)}`);

        const pagesToCapture: { url: string; filename: string }[] = [
            { url: 'https://student.sharda.ac.in/admin/home', filename: 'dashboard' },
            { url: navigationUrls.attendance || 'https://student.sharda.ac.in/admin/attendance', filename: 'attendance' },
            { url: navigationUrls.timetable || 'https://student.sharda.ac.in/admin/timetable', filename: 'timetable' }
        ];

        if (navigationUrls.marks) {
            pagesToCapture.push({ url: navigationUrls.marks, filename: 'marks' });
        }

        const results: any[] = [];

        for (const pageConfig of pagesToCapture) {
            try {
                await page.goto(pageConfig.url, { waitUntil: 'networkidle', timeout: 60000 });
                await page.waitForTimeout(3000);

                const title = await page.title();
                const currentUrl = page.url();
                const html = await page.content();

                const screenshotPath = path.join(outputDir, `${pageConfig.filename}.png`);
                const htmlPath = path.join(outputDir, `${pageConfig.filename}.html`);

                await page.screenshot({ path: screenshotPath, fullPage: true });
                fs.writeFileSync(htmlPath, html, 'utf-8');

                const metadata = await page.evaluate(() => {
                    const clean = (text: any) => {
                        const value = typeof text === "string" ? text : text == null ? "" : String(text);
                        if (!value) return '';
                        return value.trim().replace(/\s+/g, ' ');
                    };

                    const findLabelValue = (label: string) => {
                        const elements = Array.from(document.querySelectorAll('td, th, span, div, p, strong, b, label'));
                        const target = elements.find((el: any) => {
                            const text = (el.textContent?.trim() || '').toUpperCase();
                            return text === label.toUpperCase() || text === (label.toUpperCase() + ':');
                        });
                        if (!target) return 'N/A';
                        const next = target.nextElementSibling;
                        if (next) return clean(next.textContent || 'N/A');
                        const parent = target.parentElement;
                        if (parent?.nextElementSibling) return clean(parent.nextElementSibling.textContent || 'N/A');
                        return 'N/A';
                    };

                    const getTableHeaders = () => {
                        const tables = Array.from(document.querySelectorAll('table'));
                        return tables.map((table) => {
                            const headers = Array.from(table.querySelectorAll('th, tr:first-child td'))
                                .map((th) => clean(th.textContent || ''));
                            return { headers, count: headers.length };
                        });
                    };

                    const getProfileSelectors = () => {
                        const ids: string[] = [];
                        const classes: string[] = [];
                        const keywords = ['student', 'profile', 'system', 'department', 'semester', 'program', 'school'];

                        document.querySelectorAll('[id], [class]').forEach((el) => {
                            const id = (el as HTMLElement).id?.toLowerCase() || '';
                            const classList = Array.from((el as HTMLElement).classList);
                            const className = classList
                                .filter((c) => keywords.some((k) => c.toLowerCase().includes(k)))
                                .join(' ');

                            if (id && keywords.some((k) => id.includes(k))) ids.push(id);
                            if (className) classes.push(className);
                        });

                        return { ids: Array.from(new Set(ids)), classes: Array.from(new Set(classes)) };
                    };

                    return {
                        title: document.title,
                        url: window.location.href,
                        tableHeaders: getTableHeaders(),
                        profileSelectors: getProfileSelectors(),
                        studentName: (() => {
                            const selectors = ['.user-name', '.profile-name', '.student-name', '#student_name', '.navbar-user .name'];
                            for (const s of selectors) {
                                const el = document.querySelector(s);
                                if (el) return clean(el.textContent || '');
                            }
                            return 'N/A';
                        })(),
                        systemId: findLabelValue('System ID'),
                        department: findLabelValue('Department'),
                        school: findLabelValue('School'),
                        program: findLabelValue('Program'),
                        semester: findLabelValue('Semester'),
                        status: findLabelValue('Status')
                    };
                });

                logger.info(`[DIAGNOSTIC] Captured ${pageConfig.filename}: ${(html.length / 1024).toFixed(1)} KB`);

                results.push({
                    filename: pageConfig.filename,
                    title,
                    url: currentUrl,
                    htmlPath,
                    screenshotPath,
                    metadata
                });
            } catch (err) {
                logger.error(`[DIAGNOSTIC] Failed to capture ${pageConfig.filename}:`, err);
                results.push({
                    filename: pageConfig.filename,
                    url: pageConfig.url,
                    error: (err as Error).message
                });
            }
        }

        const report = {
            capturedAt: new Date().toISOString(),
            pages: results
        };

        const reportPath = path.join(outputDir, 'report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
        logger.info(`[DIAGNOSTIC] Report saved to: ${reportPath}`);
    }

    /**
     * Step 1: Request OTP from university portal
     */
    async requestOtp(systemId: string, userId: string, organizationId: string, firebaseUid?: string): Promise<string> {
        await ezoneLogger.clearLogs(systemId);
        return await this.sessionProvider.triggerOtp(systemId, userId, organizationId, firebaseUid);
    }

    private async safeLogSheets(step: string, status: 'SUCCESS' | 'FAILED' | 'PENDING', message: string) {
        try {
            if (this.googleSheets.isEnabled()) {
                await this.googleSheets.logSync(step, status, message);
            }
        } catch (e: any) {
            logger.warn(`[GoogleSheets logSync suppressed error]: ${e.message}`);
        }
    }

    /**
     * Step 2: Verify OTP and Sync Academic Data through the new pipeline
     */
    async verifyAndSync(sessionId: string, systemId: string, otp: string, userId: string, organizationId: string, firebaseUid?: string, userEmail?: string, userName?: string): Promise<IEzoneAcademicProfile> {
        try {
            await this.safeLogSheets('SYNC_STARTED', 'PENDING', `Starting sync for user ${userId}`);

            // 1. Verify OTP and get authenticated page
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Verifying OTP...', { category: 'AUTH', progress: 10 }, firebaseUid);
            await this.sessionProvider.verifyOtp(sessionId, otp, userId, organizationId, firebaseUid);
            const page = await this.sessionProvider.getAuthenticatedPage(sessionId);

            const postAuthUrl = page.url();
            const postAuthTitle = await page.title();
            const hasOtpField = await page.$('#otp, input[name="otp"]').then(el => !!el);
            const bodySnippet = await page.evaluate(() => document.body.innerHTML.substring(0, 500));

            logger.info(`[AUTH-VERIFY] URL: ${postAuthUrl}`);
            logger.info(`[AUTH-VERIFY] Title: ${postAuthTitle}`);
            logger.info(`[AUTH-VERIFY] OTP field present: ${hasOtpField}`);
            logger.info(`[AUTH-VERIFY] Body snippet: ${bodySnippet}`);

            if (hasOtpField) {
                throw new Error('Post-auth verification failed: OTP field still present on page. Authentication did not complete.');
            }

            await this.safeLogSheets('OTP_VERIFIED', 'SUCCESS', 'User identity verified');

            // DIAGNOSTIC: Capture DOM before scraping
            const diagnosticDir = path.join(process.cwd(), 'tmp', `ezone-diagnostic-${Date.now()}`);
            if (!fs.existsSync(diagnosticDir)) {
                fs.mkdirSync(diagnosticDir, { recursive: true });
            }
            await this.captureDiagnosticPages(page, diagnosticDir);
            logger.info(`[DIAGNOSTIC] Artifacts saved to: ${diagnosticDir}`);

            // 2. Extract academic data using Playwright
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Extracting academic data from Ezone...', { category: 'EXTRACTION', progress: 30 }, firebaseUid);
            const rawExtractedData = await this.scraper.extractData(page, userId, organizationId, sessionId, firebaseUid);
            await this.safeLogSheets('DATA_EXTRACTED', 'SUCCESS', 'Raw data extracted from Ezone');

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
            await this.safeLogSheets('DATA_VALIDATED', 'SUCCESS', 'Data sanitized and validated (No HTML/CSS/JS)');

            // 4. Save to Google Sheets (if enabled)
            let sheetsData: Record<string, any[][]> | null = null;
            try {
                if (this.googleSheets.isEnabled()) {
                    await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Archiving data to Google Sheets...', { category: 'SHEETS', progress: 70 }, firebaseUid);
                    sheetsData = this.mapper.toSheets(sanitizedData, systemId, userId, organizationId);
                    
                    for (const [sheetName, rows] of Object.entries(sheetsData)) {
                        if (rows && rows.length > 0) {
                            await this.googleSheets.appendRows(sheetName, rows);
                        }
                    }
                    await this.safeLogSheets('SHEETS_UPDATED', 'SUCCESS', 'Structured data saved to Google Sheets');
                }
            } catch (sheetsErr: any) {
                logger.warn('Non-fatal error in Google Sheets archival:', sheetsErr.message);
            }

            // 5. Prepare data for MongoDB
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'info', 'Syncing clean data to MongoDB...', { category: 'DATABASE', progress: 90 }, firebaseUid);
            
            let mongoData;
            if (sheetsData) {
                mongoData = this.mapper.fromSheetsToMongo(sheetsData);
            } else {
                // Use sanitized data directly if Google Sheets is disabled or failed
                mongoData = sanitizedData;
            }

            // 6. Store clean data into MongoDB
            const savedProfile = await this.repository.upsertProfile(userId, organizationId, mongoData);
            await this.safeLogSheets('MONGODB_UPDATED', 'SUCCESS', 'Clean data persisted to MongoDB');

            // 7. Sync timetable to AcademicSchedule
            try {
                const timetable = (mongoData as any).timetable || [];
                const syncResult = await this.academicScheduleSync.syncTimetable(userId, organizationId, timetable, userEmail, userName);
                logger.info(`[ACADEMIC_SCHEDULE_SYNC] events created=${syncResult.created} updated=${syncResult.updated} skipped=${syncResult.skipped}`);
            } catch (academicScheduleError: any) {
                logger.error('AcademicSchedule sync failed:', academicScheduleError);
            }

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'success', 'Academic data pipeline completed!', { category: 'DATABASE', progress: 100 }, firebaseUid);

            // Cleanup session immediately
            await this.sessionProvider.cleanupSession(sessionId);

            return savedProfile;
        } catch (error: any) {
            await this.safeLogSheets('SYNC_FAILED', 'FAILED', error.message);
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
