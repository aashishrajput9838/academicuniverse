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
            if (!page.url().includes('/admin/home')) {
                await page.goto('https://student.sharda.ac.in/admin/home', { 
                    waitUntil: 'networkidle',
                    timeout: 60000 
                });
            }

            // Wait for the page to stabilize
            await page.waitForTimeout(5000);

            // Handle mandatory popups/modals
            await this.handlePopups(page);

            const data = await page.evaluate(() => {
                const cleanText = (text: string) => {
                    if (!text) return '';
                    // Remove scripts, styles, iframes, and excessive whitespace
                    return text
                        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
                        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, '')
                        .replace(/<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gim, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                };

                const getTextByLabel = (label: string) => {
                    // Search for labels specifically in meaningful elements
                    const elements = Array.from(document.querySelectorAll('td, th, span, div, p, label, strong, b'));
                    
                    // Filter out hidden or decorative elements
                    const validElements = elements.filter(el => {
                        const style = window.getComputedStyle(el);
                        const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
                        const hasLayout = (el as HTMLElement).offsetParent !== null || el.tagName === 'BODY';
                        return isVisible && hasLayout;
                    });

                    const target = validElements.find(el => {
                        const text = el.textContent?.trim().toUpperCase() || '';
                        return text === label.toUpperCase() || text === (label.toUpperCase() + ':');
                    }) || validElements.find(el => el.textContent?.trim().toUpperCase().includes(label.toUpperCase()));
                    
                    if (!target) return '';
                    
                    const findValue = (el: Element): string => {
                        // 1. Check next sibling
                        if (el.nextElementSibling) {
                            const val = cleanText(el.nextElementSibling.textContent || '');
                            if (val && !val.includes('<') && !val.includes('>')) return val;
                        }
                        
                        // 2. Check parent's next sibling (common in table rows)
                        const parent = el.parentElement;
                        if (parent && parent.nextElementSibling) {
                            const val = cleanText(parent.nextElementSibling.textContent || '');
                            if (val && !val.includes('<') && !val.includes('>')) return val;
                        }

                        // 3. Check for value within the same element (e.g., "System ID: 2023...")
                        const fullText = cleanText(el.textContent || '');
                        if (fullText.toUpperCase().includes(label.toUpperCase())) {
                            const parts = fullText.split(new RegExp(label, 'i'));
                            if (parts.length > 1) {
                                const val = parts[1].replace(/[:\-]/g, '').trim().split('\n')[0];
                                if (val && !val.includes('<') && !val.includes('>')) return val;
                            }
                        }

                        // 4. Check all children of the parent for a value that isn't the label
                        if (parent) {
                            const siblings = Array.from(parent.children);
                            const valueNode = siblings.find(s => s !== el && cleanText(s.textContent || '') !== '');
                            if (valueNode) {
                                const val = cleanText(valueNode.textContent || '');
                                if (val && !val.includes('<') && !val.includes('>')) return val;
                            }
                        }
                        
                        return '';
                    };

                    return findValue(target);
                };

                const extractNumber = (text: string) => {
                    if (!text) return 0;
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    const match = cleaned.match(/\d+(\.\d+)?/);
                    return match ? parseFloat(match[0]) : 0;
                };

                // SHARDA SPECIFIC SELECTORS
                const getAttendanceValue = (label: string) => {
                    const specificSelectors: Record<string, string> = {
                        'Attendance %': '#attendance_perc, .attendance-perc, .perc-val',
                        'Total Classes': '#total_classes, .total-classes',
                        'Present Classes': '#present_classes, .present-classes',
                        'Absent Classes': '#absent_classes, .absent-classes'
                    };

                    const selector = specificSelectors[label];
                    if (selector) {
                        const el = document.querySelector(selector);
                        if (el && el.textContent?.trim()) return cleanText(el.textContent);
                    }

                    return getTextByLabel(label);
                };

                // Extraction logic
                let studentName = '';
                const profileContainers = Array.from(document.querySelectorAll('.user-profile, .profile-details, .student-info, .navbar-user'));
                
                // Prioritize finding name in specific containers
                for (const container of profileContainers) {
                    const nameEl = container.querySelector('.user-name, .name, h3, h4');
                    if (nameEl) {
                        const text = cleanText(nameEl.textContent || '');
                        if (text && !text.toUpperCase().includes('WELCOME') && !text.toUpperCase().includes('HOLIDAY') && !text.toUpperCase().includes('SHARDA')) {
                            studentName = text;
                            break;
                        }
                    }
                }

                if (!studentName) {
                    studentName = getTextByLabel('Student Name');
                }

                const systemId = getTextByLabel('System ID');
                const program = getTextByLabel('Program') || getTextByLabel('Course');
                const school = getTextByLabel('School') || getTextByLabel('Department');
                const status = getTextByLabel('Status');

                // Attendance Summary
                const totalClasses = extractNumber(getAttendanceValue('Total Classes') || getAttendanceValue('Total'));
                const presentClasses = extractNumber(getAttendanceValue('Present Classes') || getAttendanceValue('Present'));
                const absentClasses = extractNumber(getAttendanceValue('Absent Classes') || getAttendanceValue('Absent'));

                // Calculate attendancePercentage (Requirement 3)
                const attendancePercentage = totalClasses > 0 
                    ? parseFloat(((presentClasses / totalClasses) * 100).toFixed(2)) 
                    : 0;

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

            // Requirement 6: Log extracted values before validation
            logger.info('[EZONE] Extracted Data (Raw):', data);
            
            return data;
        } catch (error: any) {
            logger.error('Failed to extract Ezone data:', error);
            throw new Error(`Extraction Error: ${error.message}`);
        }
    }

    /**
     * Handle mandatory popups, feedback forms, or modals that block the dashboard
     */
    private async handlePopups(page: Page): Promise<void> {
        try {
            const closeButtons = [
                'button:has-text("Close")',
                'button:has-text("Skip")',
                '.modal-header .close',
                '.close-modal',
                '#close-btn'
            ];

            for (const selector of closeButtons) {
                const btn = await page.$(selector);
                if (btn && await btn.isVisible()) {
                    await btn.click();
                    await page.waitForTimeout(1000);
                }
            }
        } catch (err) {
            logger.error('Error while handling popups:', err);
        }
    }
}
