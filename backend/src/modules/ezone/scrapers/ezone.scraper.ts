import { Page } from 'playwright';
import { Logger } from '../../../shared/utils';
import * as fs from 'fs';
import * as path from 'path';

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

            // 1. RESILIENCE: Handle mandatory popups/modals (like Exit Feedback)
            await this.handlePopups(page);

            // 2. WAIT FOR DATA: Look for specific attendance indicators
            logger.info('Waiting for dashboard data to load...');
            await page.waitForSelector('.attendance-summary, .profile-info, text=Attendance', { 
                state: 'attached', 
                timeout: 15000 
            }).catch(() => logger.warn('Generic attendance indicators not found, proceeding with raw extraction.'));

            const data = await page.evaluate(() => {
                const getTextByLabel = (label: string) => {
                    const elements = Array.from(document.querySelectorAll('td, th, span, div, p, label, strong, b'));
                    // Look for exact match or strong inclusion, avoiding noise
                    const target = elements.find(el => {
                        const text = el.textContent?.trim().toUpperCase() || '';
                        return text === label.toUpperCase() || text === (label.toUpperCase() + ':');
                    }) || elements.find(el => el.textContent?.trim().toUpperCase().includes(label.toUpperCase()));
                    
                    if (!target) return '';
                    
                    const findValue = (el: Element): string => {
                        // 1. Check next sibling
                        if (el.nextElementSibling) {
                            const val = el.nextElementSibling.textContent?.trim();
                            if (val && /\d/.test(val)) return val;
                        }
                        
                        // 2. Check parent's next sibling (common in <tr>)
                        const parent = el.parentElement;
                        if (parent && parent.nextElementSibling) {
                            const val = parent.nextElementSibling.textContent?.trim();
                            if (val && /\d/.test(val)) return val;
                        }

                        // 3. Check for value within the same element (e.g., "System ID: 2023...")
                        const fullText = el.textContent || '';
                        if (fullText.toUpperCase().includes(label.toUpperCase())) {
                            const parts = fullText.split(new RegExp(label, 'i'));
                            if (parts.length > 1) {
                                const val = parts[1].replace(/[:\-]/g, '').trim().split('\n')[0];
                                if (val && /\d/.test(val)) return val;
                            }
                        }

                        // 4. NEW: Check all children of the parent for a number
                        if (parent) {
                            const siblings = Array.from(parent.children);
                            const valueNode = siblings.find(s => s !== el && /\d/.test(s.textContent || ''));
                            if (valueNode) return valueNode.textContent?.trim() || '';
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

                // SHARDA SPECIFIC: Often attendance is in a table with specific IDs
                const getAttendanceValue = (label: string) => {
                    // Try to find by specific Sharda IDs first if they exist
                    const specificSelectors: Record<string, string> = {
                        'Attendance %': '#attendance_perc, .attendance-perc, .perc-val',
                        'Total Classes': '#total_classes, .total-classes',
                        'Present Classes': '#present_classes, .present-classes',
                        'Absent Classes': '#absent_classes, .absent-classes'
                    };

                    const selector = specificSelectors[label];
                    if (selector) {
                        const el = document.querySelector(selector);
                        if (el && el.textContent?.trim()) return el.textContent.trim();
                    }

                    return getTextByLabel(label);
                };

                // Extraction logic
                // Avoid "Welcome..." text for student name
                let studentName = '';
                const nameElements = Array.from(document.querySelectorAll('.user-name, .profile-name, .student-name, h3, h4'));
                for (const el of nameElements) {
                    const text = el.textContent?.trim() || '';
                    if (text && !text.toUpperCase().includes('WELCOME') && !text.toUpperCase().includes('SHARDA')) {
                        studentName = text;
                        break;
                    }
                }
                if (!studentName) studentName = getTextByLabel('Student Name') || 'N/A';

                const systemId = getTextByLabel('System ID') || 'N/A';
                
                // If program is "Exit Feedback", it means we are still on a popup/form
                let program = getTextByLabel('Program') || getTextByLabel('Course') || 'N/A';
                if (program.toUpperCase().includes('FEEDBACK')) program = 'N/A';

                const school = getTextByLabel('School') || getTextByLabel('Department') || 'N/A';
                const status = getTextByLabel('Status') || 'Active';

                // Attendance Summary
                const attendancePercentage = extractNumber(getAttendanceValue('Attendance %') || getAttendanceValue('Percentage') || '0');
                const totalClasses = extractNumber(getAttendanceValue('Total Classes') || getAttendanceValue('Total') || '0');
                const presentClasses = extractNumber(getAttendanceValue('Present Classes') || getAttendanceValue('Present') || '0');
                const absentClasses = extractNumber(getAttendanceValue('Absent Classes') || getAttendanceValue('Absent') || '0');

                // EXTRA FALLBACK for Sharda dashboard cards: 
                // Sometimes Present/Absent are just in spans/divs inside a card with a class like 'attendance-box'
                const finalPresent = presentClasses || extractNumber(getTextByLabel('Present'));
                const finalAbsent = absentClasses || extractNumber(getTextByLabel('Absent'));
                const finalTotal = totalClasses || extractNumber(getTextByLabel('Total'));

                return {
                    studentName,
                    systemId,
                    program,
                    school,
                    status,
                    attendancePercentage,
                    totalClasses: finalTotal,
                    presentClasses: finalPresent,
                    absentClasses: finalAbsent
                };
            });

            // Requirement: Log extracted values before saving
            logger.info('[EZONE] Extracted Values:', data);
            
            // Final check: if we have 0 attendance but have a system ID, something is wrong
            if (data.systemId !== 'N/A' && data.attendancePercentage === 0) {
                logger.warn('System ID found but Attendance is 0. Dashboard might be blocked by a popup.');
                // Try one more time to handle popups and re-extract
                await this.handlePopups(page);
                // (Optionally repeat extraction here, but let's try to be proactive in handlePopups first)
            }

            return data;
        } catch (error: any) {
            logger.error('Failed to extract Ezone data:', error);
            const screenshotPath = `extraction-failed-${Date.now()}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: true });
            throw new Error(`Extraction Error: ${error.message}`);
        }
    }

    /**
     * Handle mandatory popups, feedback forms, or modals that block the dashboard
     */
    private async handlePopups(page: Page): Promise<void> {
        try {
            logger.info('Checking for blocking popups or modals...');
            
            // 1. Check for common "Close" or "Skip" buttons
            const closeButtons = [
                'button:has-text("Close")',
                'button:has-text("Skip")',
                'button:has-text("Remind Me Later")',
                '.modal-header .close',
                '.close-modal',
                '#close-btn'
            ];

            for (const selector of closeButtons) {
                const btn = await page.$(selector);
                if (btn && await btn.isVisible()) {
                    logger.info(`Closing popup using selector: ${selector}`);
                    await btn.click();
                    await page.waitForTimeout(1000);
                }
            }

            // 2. Specific Sharda Exit Feedback/Survey check
            const feedbackText = await page.content();
            if (feedbackText.toUpperCase().includes('EXIT FEEDBACK') || feedbackText.toUpperCase().includes('SURVEY')) {
                logger.warn('Detected mandatory Feedback/Survey form. Attempting to navigate to home directly.');
                await page.goto('https://student.sharda.ac.in/admin/home', { waitUntil: 'networkidle' });
                await page.waitForTimeout(2000);
            }

        } catch (err) {
            logger.error('Error while handling popups:', err);
        }
    }
}
