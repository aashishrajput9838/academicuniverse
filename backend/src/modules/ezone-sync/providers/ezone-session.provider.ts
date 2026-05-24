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
            
            // Production-grade realistic browser config to bypass bot detection
            browser = await chromium.launch({ 
                headless: true,
                slowMo: 100,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox', 
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--allow-running-insecure-content'
                ]
            });

            const context = await browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                acceptDownloads: true,
                ignoreHTTPSErrors: true
            });

            const page = await context.newPage();
            
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Connecting to Sharda University Ezone portal...', null, firebaseUid);
            
            // Navigate to verified portal URL
            await page.goto('https://student.sharda.ac.in/admin', { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });

            // Wait for full JS execution and network idle
            await page.waitForTimeout(5000);
            
            const title = await page.title();
            const currentUrl = page.url();
            logger.info(`Page loaded: ${title} at ${currentUrl}`);

            // Full Page Validation
            const html = await page.content();
            
            // Failsafe Debugging: Save state before interaction
            const debugTimestamp = Date.now();
            fs.writeFileSync(path.join(process.cwd(), `ezone-debug-${debugTimestamp}.html`), html);
            await page.screenshot({ path: path.join(process.cwd(), `ezone-debug-${debugTimestamp}.png`), fullPage: true });

            if (!html.toUpperCase().includes("STUDENT LOGIN") && !html.toUpperCase().includes("SHARDA UNIVERSITY")) {
                await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', 'Ezone login DOM failed to load correctly.', null, firebaseUid);
                throw new Error(`Actual Ezone login page not loaded (Title: ${title})`);
            }

            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Ezone portal verified. Locating System ID field...', null, firebaseUid);

            // Use VERIFIED Selector
            const systemIdSelector = '#system_id';
            try {
                await page.waitForSelector(systemIdSelector, { 
                    timeout: 30000,
                    state: 'visible' 
                });
            } catch (e) {
                // One last resilient check before failing
                const hasInput = await page.$('input[name="system_id"]');
                if (!hasInput) {
                    await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', 'System ID field not detected in DOM.', null, firebaseUid);
                    throw new Error('System ID field (#system_id) not found after full page load.');
                }
            }

            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'System ID field detected. Entering credentials...', null, firebaseUid);
            await page.fill(systemIdSelector, systemId);
            
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Submitting login request...', null, firebaseUid);
            
            // Resilient Submit Strategy
            const submitSelector = 'button[type="submit"], input[type="submit"], #btn-login';
            const submitBtn = await page.$(submitSelector);
            if (submitBtn) {
                await submitBtn.click();
            } else {
                await page.keyboard.press('Enter');
            }

            // Wait for OTP field to appear
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Waiting for university OTP response...', null, firebaseUid);
            
            const otpSelector = '#otp, input[name="otp"]';
            try {
                await page.waitForSelector(otpSelector, { timeout: 30000 });
                await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'success', 'OTP field detected. Check your student email.', null, firebaseUid);
            } catch (e) {
                await page.screenshot({ path: path.join(process.cwd(), `ezone-otp-failure-${Date.now()}.png`), fullPage: true });
                throw new Error('OTP field not detected after submission. University portal may be slow or rejected the ID.');
            }

            // Store the session for Step 2
            this.sessions.set(systemId, { browser, context, page, createdAt: new Date() });
            
            // Auto-cleanup after 10 minutes if not verified
            setTimeout(() => this.cleanupSession(systemId), 10 * 60 * 1000);

        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', `Sync failed: ${error.message}`, null, firebaseUid);
            logger.error('Ezone Automation Error:', error);
            if (browser) await browser.close();
            throw new Error(`Automation Error: ${error.message}`);
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
            
            const otpSelector = '#otp, input[name="otp"]';
            await page.fill(otpSelector, otp);
            
            const verifySelector = 'button[type="submit"], input[type="submit"], #btn-verify';
            const verifyBtn = await page.$(verifySelector);
            if (verifyBtn) {
                await verifyBtn.click();
            } else {
                await page.keyboard.press('Enter');
            }

            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Verifying session with university servers...', null, firebaseUid);
            
            // Race multiple success indicators (dashboard URL or profile elements)
            await Promise.race([
                page.waitForURL('**/dashboard', { timeout: 45000 }),
                page.waitForSelector('.user-profile', { timeout: 45000 }),
                page.waitForSelector('text=Attendance', { timeout: 45000 }),
                page.waitForSelector('text=Logout', { timeout: 45000 })
            ]);

            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'success', 'Identity verified. Session established.', null, firebaseUid);

        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', `Verification failed: ${error.message}`, null, firebaseUid);
            logger.error('OTP verification failed:', error);
            await page.screenshot({ path: path.join(process.cwd(), `ezone-verify-failure-${Date.now()}.png`), fullPage: true });
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
