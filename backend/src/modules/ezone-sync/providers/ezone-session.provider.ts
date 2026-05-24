import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneSessionProvider');

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
     * Step 1: Trigger OTP by submitting System ID
     */
    async triggerOtp(systemId: string): Promise<void> {
        try {
            logger.info('Triggering OTP for System ID:', { systemId });
            const browser = await chromium.launch({ 
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });
            const context = await browser.newContext();
            const page = await context.newPage();

            // Navigate to Sharda Student Portal
            await page.goto('https://student.sharda.ac.in/admin');

            // Find System ID input and submit
            // Note: Selectors are placeholders and need to be verified against the actual site
            await page.fill('input[name="system_id"]', systemId);
            await page.click('button[type="submit"]');

            // Wait for OTP field to appear or check for success message
            // If the site stays on the same page or redirects to OTP page
            await page.waitForSelector('input[name="otp"]', { timeout: 10000 });

            // Store the session for Step 2
            this.sessions.set(systemId, { browser, context, page, createdAt: new Date() });
            
            // Auto-cleanup after 10 minutes if not verified
            setTimeout(() => this.cleanupSession(systemId), 10 * 60 * 1000);

        } catch (error: any) {
            logger.error('Error triggering OTP:', error);
            throw new Error(`Failed to trigger OTP: ${error.message}`);
        }
    }

    /**
     * Step 2: Verify OTP and establish session
     */
    async verifyOtp(systemId: string, otp: string): Promise<any[]> {
        const session = this.sessions.get(systemId);
        if (!session) {
            throw new Error('Session expired or not found. Please request OTP again.');
        }

        try {
            logger.info('Verifying OTP for System ID:', { systemId });
            const { page, context } = session;

            // Fill OTP and submit
            await page.fill('input[name="otp"]', otp);
            await page.click('button[type="submit"]');

            // Wait for successful login (navigation to dashboard)
            await page.waitForURL('**/dashboard**', { timeout: 15000 });

            // Capture cookies
            const cookies = await context.cookies();
            
            // We don't need the browser open anymore for this specific flow if we just need cookies
            // but we might want to keep it if we scrape immediately.
            // For now, let's return cookies and keep session for immediate sync.
            return cookies;

        } catch (error: any) {
            logger.error('Error verifying OTP:', error);
            this.cleanupSession(systemId);
            throw new Error(`Failed to verify OTP: ${error.message}`);
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
