import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Logger } from '../../../shared/utils';
import { EzoneLogger } from '../services/ezone-logger.service';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('EzoneSessionProvider');
const ezoneLogger = EzoneLogger.getInstance();

export class EzoneSessionProvider {
    private static instance: EzoneSessionProvider;
    private sessions: Map<string, { browser: Browser; context: BrowserContext; page: Page; createdAt: Date }> = new Map();

    private constructor() {}

    public static getInstance(): EzoneSessionProvider {
        if (!EzoneSessionProvider.instance) {
            EzoneSessionProvider.instance = new EzoneSessionProvider();
        }
        return EzoneSessionProvider.instance;
    }

    /**
     * Step 1: Trigger OTP by submitting the system ID
     */
    async triggerOtp(systemId: string, userId: string, organizationId: string, firebaseUid?: string): Promise<void> {
        let browser: Browser | null = null;
        try {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Launching secure automation engine...', null, firebaseUid);
            browser = await chromium.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });

            const context = await browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            const page = await context.newPage();
            
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Connecting to Sharda University Ezone portal...', null, firebaseUid);
            await page.goto('https://ezone.sharda.ac.in/ezone/login', { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });

            // Production-grade selector detection strategy
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Searching for System ID field dynamically...', null, firebaseUid);
            
            const systemIdSelectors = [
                'input[name="system_id"]',
                'input[id="system_id"]',
                'input[placeholder*="System"]',
                'input[placeholder*="ID"]',
                'input[type="text"]',
                '#txtuserid'
            ];

            let foundSelector: string | null = null;
            for (const selector of systemIdSelectors) {
                try {
                    const element = await page.waitForSelector(selector, { timeout: 2000, state: 'visible' });
                    if (element) {
                        foundSelector = selector;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!foundSelector) {
                // Failsafe: Log DOM structure for debugging
                const inputDetails = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('input')).map(input => ({
                        id: input.id,
                        name: input.name,
                        type: input.type,
                        placeholder: input.placeholder,
                        className: input.className
                    }));
                });
                
                logger.error('System ID field not found. Available inputs:', { inputDetails });
                
                // Take failsafe screenshot
                const screenshotPath = path.join(process.cwd(), `ezone-failure-${Date.now()}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', `Field detection failed. Debug data captured.`, null, firebaseUid);
                
                throw new Error('Could not locate the System ID field on the university portal.');
            }

            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'System ID input detected. Entering credentials...', null, firebaseUid);
            await page.fill(foundSelector, systemId);
            
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Submitting login form...', null, firebaseUid);
            
            // Similar resilient strategy for the submit button
            const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Login")', 'button:has-text("OTP")'];
            let foundSubmit: string | null = null;
            for (const sel of submitSelectors) {
                if (await page.$(sel)) {
                    foundSubmit = sel;
                    break;
                }
            }
            
            if (foundSubmit) {
                await page.click(foundSubmit);
            } else {
                await page.keyboard.press('Enter');
            }

            // Wait for OTP field to appear with similar resilient logic
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Waiting for university OTP response...', null, firebaseUid);
            
            const otpSelectors = ['input[name="otp"]', 'input[id="otp"]', 'input[placeholder*="OTP"]', 'input[type="password"]'];
            let foundOtpField: string | null = null;
            for (const sel of otpSelectors) {
                try {
                    const el = await page.waitForSelector(sel, { timeout: 15000 });
                    if (el) {
                        foundOtpField = sel;
                        break;
                    }
                } catch (e) { continue; }
            }

            if (!foundOtpField) {
                throw new Error('OTP field not detected after submission.');
            }

            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'success', 'OTP field detected. Check your student email.', null, firebaseUid);

            // Store the session for Step 2
            this.sessions.set(systemId, { browser, context, page, createdAt: new Date() });
            
            // Auto-cleanup after 10 minutes if not verified
            setTimeout(() => this.cleanupSession(systemId), 10 * 60 * 1000);

        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', `Trigger OTP failed: ${error.message}`, null, firebaseUid);
            logger.error('Error triggering OTP:', error);
            if (browser) await browser.close();
            throw new Error(`Failed to trigger OTP: ${error.message}`);
        }
    }

    /**
     * Step 2: Verify OTP and navigate to dashboard
     */
    async verifyOtp(systemId: string, otp: string, userId: string, organizationId: string, firebaseUid?: string): Promise<void> {
        const session = this.sessions.get(systemId);
        if (!session) {
            throw new Error('Session expired or not found. Please try again.');
        }

        const { page } = session;

        try {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Submitting OTP for verification...', null, firebaseUid);
            await page.fill('input[name="otp"]', otp);
            await page.click('button[type="submit"]');

            // Wait for navigation or success indicator
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Verifying session with university servers...', null, firebaseUid);
            
            // Race multiple success indicators (dashboard URL or profile elements)
            await Promise.race([
                page.waitForURL('**/dashboard', { timeout: 30000 }),
                page.waitForSelector('.user-profile', { timeout: 30000 }),
                page.waitForSelector('text=Attendance', { timeout: 30000 })
            ]);

            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'success', 'Identity verified. Session established.', null, firebaseUid);

        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', `Verification failed: ${error.message}`, null, firebaseUid);
            logger.error('OTP verification failed:', error);
            throw new Error(`OTP verification failed: ${error.message}`);
        }
    }

    /**
     * Get an authenticated page for scraping
     */
    async getAuthenticatedPage(systemId: string): Promise<Page> {
        const session = this.sessions.get(systemId);
        if (!session) {
            throw new Error('No authenticated session found.');
        }
        return session.page;
    }

    /**
     * Cleanup session
     */
    async cleanupSession(systemId: string): Promise<void> {
        const session = this.sessions.get(systemId);
        if (session) {
            await session.browser.close();
            this.sessions.delete(systemId);
            logger.info('Session cleaned up for System ID:', { systemId });
        }
    }
}
