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
     * Step 1: Trigger OTP by submitting System ID
     */
    async triggerOtp(systemId: string, userId: string): Promise<void> {
        try {
            await ezoneLogger.clearLogs(userId);
            await ezoneLogger.logSyncStep(userId, 'info', 'Initializing automated browser session...');
            
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
            await ezoneLogger.logSyncStep(userId, 'success', 'Headless browser launched successfully.');
            
            const context = await browser.newContext();
            const page = await context.newPage();

            // Navigate to Sharda Student Portal
            await ezoneLogger.logSyncStep(userId, 'info', 'Navigating to Sharda Student Portal...');
            await page.goto('https://student.sharda.ac.in/admin', { waitUntil: 'networkidle' });
            await ezoneLogger.logSyncStep(userId, 'success', 'Portal loaded.');

            // Find System ID input and submit
            await ezoneLogger.logSyncStep(userId, 'info', `Entering System ID: ${systemId.substring(0, 4)}XXXXXX`);
            await page.fill('input[name="system_id"]', systemId);
            
            await ezoneLogger.logSyncStep(userId, 'info', 'Submitting login form...');
            await page.click('button[type="submit"]');

            // Wait for OTP field to appear
            await ezoneLogger.logSyncStep(userId, 'info', 'Waiting for university OTP response...');
            await page.waitForSelector('input[name="otp"]', { timeout: 15000 });
            await ezoneLogger.logSyncStep(userId, 'success', 'OTP field detected. Check your student email.');

            // Store the session for Step 2
            this.sessions.set(systemId, { browser, context, page, createdAt: new Date() });
            
            // Auto-cleanup after 10 minutes if not verified
            setTimeout(() => this.cleanupSession(systemId), 10 * 60 * 1000);

        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, 'error', `Trigger OTP failed: ${error.message}`);
            logger.error('Error triggering OTP:', error);
            throw new Error(`Failed to trigger OTP: ${error.message}`);
        }
    }

    /**
     * Step 2: Verify OTP and establish session
     */
    async verifyOtp(systemId: string, otp: string, userId: string): Promise<any[]> {
        const session = this.sessions.get(systemId);
        if (!session) {
            throw new Error('Session expired or not found. Please request OTP again.');
        }

        try {
            await ezoneLogger.logSyncStep(userId, 'info', 'Verifying OTP code...');
            logger.info('Verifying OTP for System ID:', { systemId });
            const { page, context } = session;

            // Fill OTP and submit
            await page.fill('input[name="otp"]', otp);
            await ezoneLogger.logSyncStep(userId, 'info', 'Submitting OTP to Ezone...');
            await page.click('button[type="submit"]');

            // Wait for successful login
            await ezoneLogger.logSyncStep(userId, 'info', 'Waiting for authenticated session redirect...');
            
            try {
                await Promise.race([
                    page.waitForURL('**/dashboard**', { timeout: 30000 }),
                    page.waitForURL('**ezone.sharda.ac.in**', { timeout: 30000 }),
                    page.waitForSelector('.student-profile-info', { timeout: 30000 })
                ]);
                await ezoneLogger.logSyncStep(userId, 'success', 'Authentication successful. Session established.');
            } catch (navError) {
                const cookies = await context.cookies();
                const hasSessionCookie = cookies.some(c => c.name.toLowerCase().includes('session') || c.name.toLowerCase().includes('auth'));
                
                if (!hasSessionCookie) {
                    const errorMsg = await page.evaluate(() => {
                        const errorEl = document.querySelector('.alert-danger, .error-message, .text-danger');
                        return errorEl ? errorEl.textContent?.trim() : null;
                    });
                    
                    await ezoneLogger.logSyncStep(userId, 'error', errorMsg || 'Authentication failed: Invalid OTP or Timeout');
                    throw new Error(errorMsg || 'Authentication failed: Timeout or invalid OTP');
                }
                await ezoneLogger.logSyncStep(userId, 'warning', 'Navigation slow, but auth cookies detected. Proceeding...');
            }

            // Capture cookies
            const cookies = await context.cookies();
            return cookies;

        } catch (error: any) {
            await ezoneLogger.logSyncStep(userId, 'error', `Verification failed: ${error.message}`);
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
