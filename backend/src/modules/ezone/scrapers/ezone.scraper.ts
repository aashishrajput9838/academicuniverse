import { Page } from 'playwright';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneScraper');

export class EzoneScraper {
    /**
     * Extract real profile and attendance data from the Ezone Home page
     * URL: https://student.sharda.ac.in/admin/home
     */
    async extractData(page: Page): Promise<any> {
        try {
            logger.info('Starting extraction from Ezone Home...');
            
            // Navigate to the home page if not already there
            const currentUrl = page.url();
            if (!currentUrl.includes('/admin/home')) {
                await page.goto('https://student.sharda.ac.in/admin/home', { 
                    waitUntil: 'networkidle',
                    timeout: 60000 
                });
            }

            // Wait for the page to stabilize
            await page.waitForTimeout(3000);

            // Resilient selector: Wait for 'System ID' to be ATTACHED, not necessarily visible
            // Some portals use hidden containers or lazy-loaded tabs
            logger.info('Waiting for System ID element to be attached...');
            await page.waitForSelector('text=System ID', { 
                state: 'attached', 
                timeout: 30000 
            }).catch(async (err) => {
                logger.warn('System ID text not found by direct selector, checking page title and content...');
                const title = await page.title();
                const content = await page.content();
                logger.info(`Page Title: ${title}`);
                if (content.includes('Login')) {
                    throw new Error('Still on login page - authentication may have failed or timed out.');
                }
            });

            const data = await page.evaluate(() => {
                const getTextByLabel = (label: string) => {
                    // Search all elements for the label text, case-insensitive
                    const elements = Array.from(document.querySelectorAll('td, th, span, div, p, label, strong, b'));
                    const target = elements.find(el => el.textContent?.trim().toUpperCase().includes(label.toUpperCase()));
                    
                    if (!target) return '';
                    
                    // Try to find the value in common nearby locations
                    const findValue = (el: Element): string => {
                        // 1. Next sibling
                        if (el.nextElementSibling) return el.nextElementSibling.textContent?.trim() || '';
                        
                        // 2. Parent's next sibling (common in table rows)
                        const parent = el.parentElement;
                        if (parent && parent.nextElementSibling) return parent.nextElementSibling.textContent?.trim() || '';
                        
                        // 3. Same container text after the label
                        const fullText = el.textContent || '';
                        const parts = fullText.split(label);
                        if (parts.length > 1) {
                            return parts[1].replace(/[:\-]/g, '').trim().split('\n')[0];
                        }

                        // 4. If target has a parent, try the parent's full text
                        if (parent) {
                            const parentText = parent.textContent || '';
                            const pParts = parentText.split(label);
                            if (pParts.length > 1) {
                                return pParts[1].replace(/[:\-]/g, '').trim().split('\n')[0];
                            }
                        }
                        
                        return '';
                    };

                    return findValue(target);
                };

                const extractNumber = (text: string) => {
                    if (!text) return 0;
                    // Handle percentages like "82.35%" or "82.35"
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    const match = cleaned.match(/\d+(\.\d+)?/);
                    return match ? parseFloat(match[0]) : 0;
                };

                // Extraction logic
                const studentName = document.querySelector('.user-name, .profile-name, h3, h4')?.textContent?.trim() || getTextByLabel('Student Name') || 'N/A';
                const systemId = getTextByLabel('System ID') || 'N/A';
                const program = getTextByLabel('Program') || getTextByLabel('Course') || 'N/A';
                const school = getTextByLabel('School') || getTextByLabel('Department') || 'N/A';
                const status = getTextByLabel('Status') || 'Active';

                // Attendance Summary
                const attendancePercentage = extractNumber(getTextByLabel('Attendance %') || getTextByLabel('Percentage') || '0') || 0;
                const totalClasses = extractNumber(getTextByLabel('Total Classes') || getTextByLabel('Total') || '0') || 0;
                const presentClasses = extractNumber(getTextByLabel('Present Classes') || getTextByLabel('Present') || '0') || 0;
                const absentClasses = extractNumber(getTextByLabel('Absent Classes') || getTextByLabel('Absent') || '0') || 0;

                return {
                    studentName,
                    systemId,
                    program,
                    school,
                    status,
                    attendancePercentage,
                    totalClasses,
                    presentClasses,
                    absentClasses
                };
            });

            // Requirement: Log extracted values before saving
            logger.info('[EZONE] Extracted Values:', data);
            
            // Validation: If we got nothing at all, it's an error
            if (data.systemId === 'N/A' && data.attendancePercentage === 0) {
                const title = await page.title();
                const url = page.url();
                throw new Error(`Failed to extract data. Page Title: ${title}, URL: ${url}`);
            }

            return data;
        } catch (error: any) {
            logger.error('Failed to extract Ezone data:', error);
            // Capture screenshot for debugging
            try {
                const screenshotPath = `extraction-failed-${Date.now()}.png`;
                await page.screenshot({ path: screenshotPath, fullPage: true });
                logger.info(`Debug screenshot saved to ${screenshotPath}`);
            } catch (screenshotError) {
                logger.error('Failed to capture debug screenshot');
            }
            throw new Error(`Extraction Error: ${error.message}`);
        }
    }
}
