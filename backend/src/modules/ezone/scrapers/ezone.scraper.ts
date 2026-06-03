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
            
            // Navigate to the home page
            await page.goto('https://student.sharda.ac.in/admin/home', { 
                waitUntil: 'networkidle',
                timeout: 60000 
            });

            // Wait for profile details to be visible
            // The selectors below are based on the user's requirement and expected university portal structure
            await page.waitForSelector('text=System ID', { timeout: 30000 });

            const data = await page.evaluate(() => {
                const getTextByLabel = (label: string) => {
                    const elements = Array.from(document.querySelectorAll('td, th, span, div, p, label'));
                    const target = elements.find(el => el.textContent?.trim().includes(label));
                    if (!target) return '';
                    
                    // Usually the value is in the next sibling or a child
                    const parent = target.parentElement;
                    if (parent) {
                        const nextSibling = target.nextElementSibling;
                        if (nextSibling) return nextSibling.textContent?.trim() || '';
                        
                        // Try finding value in the same parent row/cell
                        const text = parent.textContent || '';
                        const parts = text.split(label);
                        if (parts.length > 1) {
                            return parts[1].replace(/[:\-]/, '').trim().split('\n')[0];
                        }
                    }
                    return '';
                };

                const extractNumber = (text: string) => {
                    const match = text.match(/\d+(\.\d+)?/);
                    return match ? parseFloat(match[0]) : 0;
                };

                // Extracting Profile Data
                const studentName = getTextByLabel('Student Name') || document.querySelector('.user-name')?.textContent?.trim() || 'N/A';
                const systemId = getTextByLabel('System ID') || 'N/A';
                const program = getTextByLabel('Program') || 'N/A';
                const school = getTextByLabel('School') || 'N/A';
                const status = getTextByLabel('Status') || 'Active';

                // Extracting Attendance Data (Summary Section)
                // We look for labels like "Total Classes", "Present", "Absent", "Attendance %"
                const attendancePercentage = extractNumber(getTextByLabel('Attendance %') || getTextByLabel('Percentage') || '0');
                const totalClasses = extractNumber(getTextByLabel('Total Classes') || getTextByLabel('Total') || '0');
                const presentClasses = extractNumber(getTextByLabel('Present Classes') || getTextByLabel('Present') || '0');
                const absentClasses = extractNumber(getTextByLabel('Absent Classes') || getTextByLabel('Absent') || '0');

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
            
            if (data.systemId === 'N/A') {
                throw new Error('Failed to extract core profile data (System ID missing)');
            }

            return data;
        } catch (error: any) {
            logger.error('Failed to extract Ezone data:', error);
            // Take a screenshot for debugging if extraction fails
            await page.screenshot({ path: `extraction-failed-${Date.now()}.png`, fullPage: true });
            throw new Error(`Extraction Error: ${error.message}`);
        }
    }
}
