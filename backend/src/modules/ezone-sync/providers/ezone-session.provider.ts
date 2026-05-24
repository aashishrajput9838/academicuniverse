import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Logger } from '../../../shared/utils';
import { EzoneLogger } from '../services/ezone-logger.service';

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
    async triggerOtp(systemId: string, userId: string, organizationId: string): Promise<void> {
        let browser: Browser | null = null;
        try {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Launching secure automation engine...');
            browser = await chromium.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });

            const context = await browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            const page = await context.newPage();
            
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Connecting to Sharda University Ezone portal...');
            await page.goto('https://ezone.sharda.ac.in/ezone/login', { 
                waitUntil: 'networkidle', 
                timeout: 30000 
            });

            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', `Entering System ID: ${systemId}...`);
            await page.fill('input[name="system_id"]', systemId);
            
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Submitting login form...');
            await page.click('button[type="submit"]');

            // Wait for OTP field to appear
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Waiting for university OTP response...');
            await page.waitForSelector('input[name="otp"]', { timeout: 15000 });
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'success', 'OTP field detected. Check your student email.');

            // Store the session for Step 2
            this.sessions.set(systemId, { browser, context, page, createdAt: new Date() });
            
            // Auto-cleanup after 10 minutes if not verified
            setTimeout(() => this.cleanupSession(systemId), 10 * 60 * 1000);

        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', `Trigger OTP failed: ${error.message}`);
            logger.error('Error triggering OTP:', error);
            if (browser) await browser.close();
            throw new Error(`Failed to trigger OTP: ${error.message}`);
        }
    }

    /**
     * Step 2: Verify OTP and navigate to dashboard
     */
    async verifyOtp(systemId: string, otp: string, userId: string, organizationId: string): Promise<void> {
        const session = this.sessions.get(systemId);
        if (!session) {
            throw new Error('Session expired or not found. Please try again.');
        }

        const { page } = session;

        try {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Submitting OTP for verification...');
            await page.fill('input[name="otp"]', otp);
            await page.click('button[type="submit"]');

            // Wait for navigation or success indicator
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'info', 'Verifying session with university servers...');
            
            // Race multiple success indicators (dashboard URL or profile elements)
            await Promise.race([
                page.waitForURL('**/dashboard', { timeout: 30000 }),
                page.waitForSelector('.user-profile', { timeout: 30000 }),
                page.waitForSelector('text=Attendance', { timeout: 30000 })
            ]);

            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'success', 'Identity verified. Session established.');

        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, organizationId, systemId, 'error', `Verification failed: ${error.message}`);
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
