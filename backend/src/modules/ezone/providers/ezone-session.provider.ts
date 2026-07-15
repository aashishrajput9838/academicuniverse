import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../../shared/utils';
import { EzoneLogger } from '../services/ezone-logger.service';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('EzoneSessionProvider');
const ezoneLogger = EzoneLogger.getInstance();

export class EzoneSessionProvider {
    private static instance: EzoneSessionProvider;
    private sessions: Map<string, { 
        browser: Browser; 
        context: BrowserContext; 
        page: Page; 
        systemId: string;
        createdAt: Date 
    }> = new Map();

    private constructor() {
        logger.info('EzoneSessionProvider initialized - Session Map cleared.');
        
        // Background task to clean up old sessions every minute
        const cleanupTimer = setInterval(() => this.cleanupExpiredSessions(), 60 * 1000);
        cleanupTimer.unref?.();
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
    async triggerOtp(systemId: string, userId: string, organizationId: string, firebaseUid?: string): Promise<string> {
        let browser: Browser | null = null;
        const sessionId = uuidv4();
        
        try {
            // Check for Render Free Tier / Low Memory environment
            const memoryMB = Math.round(require('os').totalmem() / 1024 / 1024);
            if (memoryMB < 600 && process.env.NODE_ENV === 'production') {
                logger.warn(`Low memory environment detected (${memoryMB}MB). Playwright may crash the server.`);
                await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'error', 'Server memory is too low to run the automation engine. Please upgrade your hosting plan (min 1GB RAM recommended).', { category: 'AUTHENTICATION', status: 'failed' }, firebaseUid);
                throw new Error('Insufficient server memory to start automation engine.');
            }

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Launching secure automation engine...', { category: 'AUTHENTICATION', actionType: 'playwright.launch', progress: 5 }, firebaseUid);
            
            // Memory-optimized browser config for Render Free Tier
            browser = await chromium.launch({ 
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox', 
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-gpu',
                    '--disable-images',
                    '--disable-devtools',
                    '--disable-background-networking',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-metrics',
                    '--disable-default-apps',
                    '--mute-audio',
                    '--no-first-run'
                ]
            });

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Browser engine ready. Creating secure context...', { category: 'AUTHENTICATION', actionType: 'browser.newContext', progress: 10 }, firebaseUid);

            const context = await browser.newContext({
                viewport: { width: 800, height: 600 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/136.0.0.0 Safari/537.36',
                acceptDownloads: false,
                ignoreHTTPSErrors: true
            });

            const page = await context.newPage();
            
            // PRE-STORE SESSION
            this.sessions.set(sessionId, { browser, context, page, systemId, createdAt: new Date() });

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Connecting to Sharda University Ezone portal...', { category: 'AUTHENTICATION', actionType: 'page.goto', progress: 15 }, firebaseUid);
            
            // Navigate to verified portal URL
            await page.goto('https://student.sharda.ac.in/admin', { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'info', 'Portal reached. Waiting for login DOM to stabilize...', { category: 'AUTHENTICATION', actionType: 'page.waitForTimeout', progress: 20 }, firebaseUid);
            await page.waitForTimeout(5000);
            
            const title = await page.title();
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'success', `Ezone portal verified: "${title}"`, { category: 'AUTHENTICATION', progress: 25 }, firebaseUid);

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Locating System ID field...', { category: 'AUTHENTICATION', actionType: 'page.waitForSelector', progress: 30 }, firebaseUid);

            // Use VERIFIED Selector
            const systemIdSelector = '#system_id';
            try {
                await page.waitForSelector(systemIdSelector, { timeout: 30000, state: 'visible' });
            } catch (e) {
                const hasInput = await page.$('input[name="system_id"]');
                if (!hasInput) throw new Error('System ID field (#system_id) not found after full page load.');
            }

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', `Entering System ID: ${systemId}...`, { category: 'AUTHENTICATION', actionType: 'page.fill', progress: 35 }, firebaseUid);
            await page.fill(systemIdSelector, systemId);
            await page.waitForTimeout(1500);

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Locating OTP trigger button...', { category: 'AUTHENTICATION', actionType: 'page.locator', progress: 40 }, firebaseUid);
            
            const otpTriggerSelector = '#send_stu_otp_phone';
            const otpTriggerButton = page.locator(otpTriggerSelector);

            try {
                await otpTriggerButton.waitFor({ state: 'visible', timeout: 30000 });
                await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Triggering university OTP service...', { category: 'AUTHENTICATION', actionType: 'otpTriggerButton.click', progress: 45 }, firebaseUid);
                
                await otpTriggerButton.click({ force: true });
                await page.evaluate((sel) => {
                    const btn = document.querySelector(sel) as HTMLElement;
                    if (btn) btn.click();
                }, otpTriggerSelector);

            } catch (e) {
                throw new Error('Verified OTP trigger button (#send_stu_otp_phone) not found or not visible.');
            }

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'info', 'Waiting for university backend to dispatch OTP...', { category: 'AUTHENTICATION', progress: 50 }, firebaseUid);
            await page.waitForTimeout(5000);

            const otpInputSelector = '#otp, input[name="otp"]';
            try {
                await page.waitForSelector(otpInputSelector, { timeout: 30000 });
                await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'success', 'OTP successfully triggered. Check your student email.', { category: 'AUTHENTICATION', progress: 100 }, firebaseUid);
            } catch (e) {
                throw new Error('OTP input field did not appear. The university portal may have rejected the ID or is experiencing delays.');
            }

            return sessionId;

        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'error', `Authentication failed: ${error.message}`, { category: 'AUTHENTICATION', status: 'failed' }, firebaseUid);
            if (browser) await browser.close();
            this.sessions.delete(sessionId);
            throw error;
        }
    }

    /**
     * Step 2: Verify OTP and navigate to dashboard
     */
    async verifyOtp(sessionId: string, otp: string, userId: string, organizationId: string, firebaseUid?: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session expired or not found. Please try again.');

        const { page, systemId } = session;
        
        try {
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', `Submitting OTP for System ID: ${systemId}...`, { category: 'AUTHENTICATION', actionType: 'page.fill', progress: 10 }, firebaseUid);
            
            const otpSelector = '#otp, input[name="otp"]';
            await page.fill(otpSelector, otp);
            
            const verifySelector = 'button[type="submit"], input[type="submit"], #btn-verify';
            const verifyBtn = await page.$(verifySelector);
            
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Authenticating with university servers...', { category: 'AUTHENTICATION', actionType: 'verifyBtn.click', progress: 30 }, firebaseUid);
            
            if (verifyBtn) {
                await verifyBtn.click();
            } else {
                await page.keyboard.press('Enter');
            }

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'info', 'Verifying secure session tokens...', { category: 'AUTHENTICATION', progress: 60 }, firebaseUid);
            
            await Promise.race([
                page.waitForURL('**/dashboard', { timeout: 45000 }),
                page.waitForSelector('.user-profile', { timeout: 45000 }),
                page.waitForSelector('text=Attendance', { timeout: 45000 }),
                page.waitForSelector('text=Logout', { timeout: 45000 })
            ]);

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'success', 'Identity verified. Dashboard access granted.', { category: 'AUTHENTICATION', progress: 100 }, firebaseUid);

        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'error', `Verification failed: ${error.message}`, { category: 'AUTHENTICATION', status: 'failed' }, firebaseUid);
            throw error;
        }
    }

    /**
     * Get an authenticated page for scraping
     */
    async getAuthenticatedPage(sessionId: string): Promise<Page> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('No authenticated session found.');
        }
        return session.page;
    }

    /**
     * Cleanup session
     */
    async cleanupSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (session) {
            await session.browser.close();
            this.sessions.delete(sessionId);
            logger.info(`Session destroyed: ${sessionId}`);
            this.logActiveSessions();
        }
    }

    /**
     * Periodic cleanup of expired sessions (TTL 10 mins)
     */
    private async cleanupExpiredSessions(): Promise<void> {
        const now = new Date();
        const TTL = 10 * 60 * 1000; // 10 minutes

        for (const [id, session] of this.sessions.entries()) {
            const age = now.getTime() - session.createdAt.getTime();
            if (age > TTL) {
                logger.info(`Cleaning up expired session: ${id} (Age: ${Math.round(age / 1000)}s)`);
                await this.cleanupSession(id);
            }
        }
    }

    /**
     * Diagnostic log of active sessions
     */
    private logActiveSessions(): void {
        const now = new Date();
        const activeSessions = Array.from(this.sessions.entries()).map(([id, s]) => ({
            id,
            systemId: s.systemId,
            age: `${Math.round((now.getTime() - s.createdAt.getTime()) / 1000)}s`
        }));
        
        logger.info(`Active Sessions Status:`, {
            count: this.sessions.size,
            sessions: activeSessions
        });
    }
}
