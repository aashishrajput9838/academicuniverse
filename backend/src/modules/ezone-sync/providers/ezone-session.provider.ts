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

    private constructor() {
        logger.info('EzoneSessionProvider initialized - Session Map cleared.');
    }

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
            
            // PRE-STORE SESSION: Store as soon as browser is up to avoid race conditions with verifyOtp
            logger.info(`Pre-storing session for ${systemId}`);
            this.sessions.set(systemId, { browser, context, page, createdAt: new Date() });

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
            
            // Add a small human-like delay before locating the OTP trigger button
            await page.waitForTimeout(1500);

            // Step 2: Locate and click the REAL OTP trigger button
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Locating OTP trigger button...', null, firebaseUid);
            
            const otpTriggerSelector = '#send_stu_otp_phone';
            const otpTriggerButton = page.locator(otpTriggerSelector);

            try {
                await otpTriggerButton.waitFor({ state: 'visible', timeout: 30000 });
                await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'OTP trigger button located. Triggering...', null, firebaseUid);
                
                // Force click the anchor element since it uses javascript:void(0)
                await otpTriggerButton.click({ force: true });
                
                // JS Fallback if the standard click doesn't trigger the university's event
                await page.evaluate((sel) => {
                    const btn = document.querySelector(sel) as HTMLElement;
                    if (btn) btn.click();
                }, otpTriggerSelector);

            } catch (e) {
                await page.screenshot({ path: path.join(process.cwd(), `ezone-trigger-missing-${Date.now()}.png`), fullPage: true });
                throw new Error('Verified OTP trigger button (#send_stu_otp_phone) not found or not visible.');
            }

            // Post-click wait for university backend to process and UI to update
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Waiting for university OTP response...', null, firebaseUid);
            await page.waitForTimeout(5000);
            await page.screenshot({ path: path.join(process.cwd(), `after-otp-click-${Date.now()}.png`), fullPage: true });

            // Wait for OTP input field to appear (confirmation that trigger worked)
            const otpInputSelector = '#otp, input[name="otp"]';
            try {
                await page.waitForSelector(otpInputSelector, { timeout: 30000 });
                await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'success', 'OTP successfully triggered. Check your student email.', null, firebaseUid);
            } catch (e) {
                await page.screenshot({ path: path.join(process.cwd(), `ezone-otp-input-timeout-${Date.now()}.png`), fullPage: true });
                throw new Error('OTP input field did not appear. The university portal may have rejected the ID or is experiencing delays.');
            }

            // Auto-cleanup after 10 minutes if not verified
            setTimeout(() => this.cleanupSession(systemId), 10 * 60 * 1000);

        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', `Sync failed: ${error.message}`, null, firebaseUid);
            logger.error('Ezone Automation Error:', error);
            if (browser) await browser.close();
            this.sessions.delete(systemId); // Ensure cleanup on error
            throw new Error(`Automation Error: ${error.message}`);
        }
    }

    /**
     * Step 2: Verify OTP and navigate to dashboard
     */
    async verifyOtp(systemId: string, otp: string, userId: string, organizationId: string, firebaseUid?: string): Promise<void> {
        logger.info(`Looking up session for ${systemId}. Available keys: ${Array.from(this.sessions.keys()).join(', ')}`);
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
