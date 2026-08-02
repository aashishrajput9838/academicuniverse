import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { randomUUID as uuidv4 } from 'crypto';
import { Logger } from '../../../shared/utils';
import { EzoneLogger } from '../services/ezone-logger.service';

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
        
        // Background task to clean up old sessions every 1 minute (TTL 3 mins)
        const cleanupTimer = setInterval(() => this.cleanupExpiredSessions(), 1 * 60 * 1000);
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
        const { logMemoryCheckpoint } = await import('../../../utils/memoryLogger');
        logMemoryCheckpoint('PLAYWRIGHT_LAUNCH_BEFORE', { systemId, activeSessionsCount: this.sessions.size });

        let browser: Browser | null = null;
        const sessionId = uuidv4();
        
        try {
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Launching Playwright automation engine...', { category: 'AUTHENTICATION', actionType: 'playwright.launch', progress: 5 }, firebaseUid);
            
            browser = await chromium.launch({ 
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox', 
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-gpu',
                    '--disable-images',
                    '--mute-audio',
                    '--no-first-run'
                ]
            });

            logMemoryCheckpoint('PLAYWRIGHT_LAUNCH_AFTER', { sessionId, activeSessionsCount: this.sessions.size + 1 });

            const context = await browser.newContext({
                viewport: { width: 1280, height: 800 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/136.0.0.0 Safari/537.36',
                acceptDownloads: false,
                ignoreHTTPSErrors: true
            });

            const page = await context.newPage();
            
            // Store active session in memory map
            this.sessions.set(sessionId, { browser, context, page, systemId, createdAt: new Date() });

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Connecting to Sharda Ezone portal...', { category: 'AUTHENTICATION', actionType: 'page.goto', progress: 15 }, firebaseUid);
            
            await page.goto('https://student.sharda.ac.in/admin', { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
            });

            await page.waitForTimeout(1000);
            const title = await page.title();
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'success', `Connected to portal: "${title}"`, { category: 'AUTHENTICATION', progress: 25 }, firebaseUid);

            const systemIdSelector = '#system_id, input[name="system_id"]';
            await page.waitForSelector(systemIdSelector, { timeout: 15000, state: 'visible' });

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', `Entering System ID: ${systemId}...`, { category: 'AUTHENTICATION', actionType: 'page.fill', progress: 35 }, firebaseUid);
            await page.fill(systemIdSelector, systemId);
            await page.waitForTimeout(500);

            const otpTriggerSelector = '#send_stu_otp_email, button[type="submit"]';
            await page.click(otpTriggerSelector);

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'info', 'OTP requested from university servers. Check your student email.', { category: 'AUTHENTICATION', progress: 100 }, firebaseUid);
            return sessionId;

        } catch (error: any) {
            logger.error(`Trigger OTP failed for session ${sessionId}: ${error.message}`);
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'error', `Portal connection error: ${error.message}`, { category: 'AUTHENTICATION', status: 'failed' }, firebaseUid);
            
            // Guarantee browser closure if launch succeeded before session registration
            if (browser && !this.sessions.has(sessionId)) {
                await browser.close().catch(() => {});
            } else {
                await this.cleanupSession(sessionId);
            }
            throw error;
        }
    }

    /**
     * Step 2: Verify OTP and navigate to dashboard
     */
    async verifyOtp(sessionId: string, otp: string, userId: string, organizationId: string, firebaseUid?: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session expired or not found. Please click "Send OTP" to start a new session.');

        const { page, systemId } = session;
        
        try {
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', `Submitting OTP for System ID: ${systemId}...`, { category: 'AUTHENTICATION', actionType: 'page.fill', progress: 10 }, firebaseUid);
            
            const otpSelector = '#otp, input[name="otp"]';
            await page.waitForSelector(otpSelector, { timeout: 15000, state: 'visible' });
            await page.fill(otpSelector, otp);
            
            const verifySelector = 'button[type="submit"], input[type="submit"], #btn-verify';
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Authenticating session with university servers...', { category: 'AUTHENTICATION', actionType: 'page.click', progress: 30 }, firebaseUid);
            
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
                page.click(verifySelector)
            ]);

            await page.waitForTimeout(2000);
            const currentUrl = page.url();
            logger.info(`[PLAYWRIGHT-LIFECYCLE] Post-auth URL: ${currentUrl}`);

            const hasOtpField = await page.$('#otp, input[name="otp"]').then(el => !!el);
            if (hasOtpField) {
                throw new Error('Authentication failed: OTP field still present on portal page. Verification did not complete.');
            }

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
        if (!session || !session.page || session.page.isClosed()) {
            throw new Error('Authenticated Playwright session or page has closed.');
        }
        return session.page;
    }

    /**
     * Cleanup session safely with stack trace instrumentation
     */
    async cleanupSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (session) {
            const stack = new Error().stack;
            logger.info(`[STACK-TRACE-CLEANUP] Destroying Playwright session: ${sessionId}\n${stack}`);

            try {
                if (session.page && !session.page.isClosed()) {
                    await session.page.close().catch(() => {});
                }
            } catch (err: any) {
                logger.warn(`Error closing page for session ${sessionId}: ${err.message}`);
            }

            try {
                if (session.context) {
                    await session.context.close().catch(() => {});
                }
            } catch (err: any) {
                logger.warn(`Error closing context for session ${sessionId}: ${err.message}`);
            }

            try {
                if (session.browser && session.browser.isConnected()) {
                    await session.browser.close().catch(() => {});
                }
            } catch (err: any) {
                logger.warn(`Error closing browser for session ${sessionId}: ${err.message}`);
            }

            this.sessions.delete(sessionId);
            logger.info(`✓ Session destroyed cleanly: ${sessionId}`);
        }
    }

    /**
     * Periodic cleanup of expired sessions (TTL 15 mins)
     */
    private async cleanupExpiredSessions(): Promise<void> {
        const now = new Date();
        const TTL = 3 * 60 * 1000; // 3 minutes

        for (const [id, session] of this.sessions.entries()) {
            const age = now.getTime() - session.createdAt.getTime();
            if (age > TTL) {
                logger.info(`Cleaning up expired session: ${id} (Age: ${Math.round(age / 1000)}s)`);
                await this.cleanupSession(id);
            }
        }
    }
}
