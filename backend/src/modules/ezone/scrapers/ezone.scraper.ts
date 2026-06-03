import { Page } from 'playwright';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneScraper');

export class EzoneScraper {
    /**
     * Strict sanitization to prevent raw HTML/CSS/JS from entering the database
     */
    private sanitize(text: string): string {
        if (!text) return '';
        
        // 1. Remove common HTML tags
        let clean = text.replace(/<[^>]*>?/gm, ' ');
        
        // 2. Remove technical fragments and CSS-like patterns
        const blacklist = [
            /\.apexcharts[a-z-]*/gi,
            /iframe/gi,
            /script/gi,
            /style/gi,
            /translateY\([^)]*\)/gi,
            /display\s*:\s*[a-z-]+/gi,
            /position\s*:\s*[a-z-]+/gi,
            /color\s*:\s*#[0-9a-f]+/gi,
            /background\s*:\s*[a-z]+/gi,
            /padding\s*:\s*[0-9]+px/gi,
            /!important/gi,
            /\{[\s\S]*?\}/g, // CSS blocks
            /\s\s+/g // Multiple spaces
        ];

        blacklist.forEach(pattern => {
            clean = clean.replace(pattern, ' ');
        });

        return clean.trim();
    }

    /**
     * Reject values that still contain suspicious technical terms
     */
    private isValidValue(value: any): boolean {
        if (typeof value !== 'string') return true;
        if (!value || value === 'N/A') return true;

        const suspiciousTerms = [
            '.apexcharts', 'iframe', 'script', 'style', 'translateY(', 
            'display:flex', 'position:absolute', 'fill:', 'stroke:',
            'data-v-', 'ng-content', 'react-root'
        ];

        return !suspiciousTerms.some(term => value.toLowerCase().includes(term.toLowerCase()));
    }

    /**
     * Extract real profile and attendance data from the Ezone Home page
     * URL: https://student.sharda.ac.in/admin/home
     */
    async extractData(page: Page, userId: string, organizationId: string, sessionId: string, firebaseUid?: string): Promise<any> {
        const ezoneLogger = (await import('../services/ezone-logger.service')).EzoneLogger.getInstance();
        
        try {
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Navigating to Dashboard Home...', { category: 'EXTRACTION', actionType: 'page.goto', progress: 5 }, firebaseUid);
            
            // Navigate to the home page if not already there
            if (!page.url().includes('/admin/home')) {
                await page.goto('https://student.sharda.ac.in/admin/home', { 
                    waitUntil: 'networkidle',
                    timeout: 60000 
                });
            }

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'info', 'Dashboard reached. Waiting for data widgets to render...', { category: 'EXTRACTION', actionType: 'page.waitForTimeout', progress: 15 }, firebaseUid);
            await page.waitForTimeout(5000);

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Checking for blocking popups or feedback forms...', { category: 'EXTRACTION', actionType: 'handlePopups', progress: 25 }, firebaseUid);
            await this.handlePopups(page, userId, organizationId, sessionId, firebaseUid);

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Executing strict structured extraction...', { category: 'EXTRACTION', actionType: 'page.evaluate', progress: 50 }, firebaseUid);
            
            const rawData = await page.evaluate(() => {
                const clean = (text: string) => {
                    if (!text) return '';
                    return text.trim().replace(/\s+/g, ' ');
                };

                const extractTable = (selector: string, colMap: Record<string, number>) => {
                    const table = document.querySelector(selector);
                    if (!table) return [];
                    
                    const rows = Array.from(table.querySelectorAll('tr')).slice(1); // Skip header
                    return rows.map(row => {
                        const cells = Array.from(row.querySelectorAll('td'));
                        const data: any = {};
                        Object.entries(colMap).forEach(([key, idx]) => {
                            data[key] = clean(cells[idx]?.textContent || 'N/A');
                        });
                        return data;
                    });
                };

                const findLabelValue = (label: string) => {
                    const elements = Array.from(document.querySelectorAll('td, th, span, div, p, strong, b, label'));
                    const target = elements.find(el => {
                        const text = el.textContent?.trim().toUpperCase() || '';
                        return text === label.toUpperCase() || text === (label.toUpperCase() + ':');
                    });
                    
                    if (!target) return 'N/A';
                    
                    // Try next sibling
                    if (target.nextElementSibling) return clean(target.nextElementSibling.textContent || 'N/A');
                    
                    // Try parent's next sibling
                    const parent = target.parentElement;
                    if (parent && parent.nextElementSibling) return clean(parent.nextElementSibling.textContent || 'N/A');

                    return 'N/A';
                };

                // PROFILE
                const profile = {
                    studentName: '',
                    systemId: findLabelValue('System ID'),
                    program: findLabelValue('Program') || findLabelValue('Course'),
                    school: findLabelValue('School') || findLabelValue('Department'),
                    semester: findLabelValue('Semester') || findLabelValue('Term'),
                    status: findLabelValue('Status') || 'Active'
                };

                // Find Name
                const nameSelectors = ['.user-name', '.profile-name', '.student-name', '#student_name', '.navbar-user .name'];
                for (const s of nameSelectors) {
                    const el = document.querySelector(s);
                    if (el) {
                        let text = clean(el.textContent || '');
                        if (text && text.length > 2 && !text.toUpperCase().includes('WELCOME')) {
                            profile.studentName = text;
                            break;
                        }
                    }
                }

                // ATTENDANCE
                const attendance = {
                    percentage: findLabelValue('Attendance %') || findLabelValue('Attendance'),
                    total: findLabelValue('Total Classes') || findLabelValue('Total'),
                    present: findLabelValue('Present Classes') || findLabelValue('Present'),
                    absent: findLabelValue('Absent Classes') || findLabelValue('Absent')
                };

                // CA MARKS (Continuous Assessment)
                // Assuming CA marks are in a table with Course, Assignment, Assessment, Total
                const caMarks = extractTable('.ca-marks-table, table:has(th:contains("Course"))', {
                    courseName: 0,
                    assignmentMarks: 1,
                    assessmentMarks: 2,
                    total: 3
                });

                // TIMETABLE
                const timetable = extractTable('.timetable-table, table:has(th:contains("Subject"))', {
                    subject: 0,
                    faculty: 1,
                    room: 2,
                    time: 3
                });

                // HOLIDAYS
                const holidays = extractTable('.holidays-table, table:has(th:contains("Holiday"))', {
                    name: 0,
                    date: 1
                });

                return { profile, attendance, caMarks, timetable, holidays };
            });

            // Post-Extraction Sanitization & Validation
            const sanitizedData = {
                studentName: this.sanitize(rawData.profile.studentName),
                systemId: this.sanitize(rawData.profile.systemId),
                program: this.sanitize(rawData.profile.program),
                school: this.sanitize(rawData.profile.school),
                status: this.sanitize(rawData.profile.status),
                
                attendancePercentage: parseFloat(rawData.attendance.percentage.replace(/[^0-9.]/g, '')) || 0,
                totalClasses: parseInt(rawData.attendance.total.replace(/[^0-9]/g, '')) || 0,
                presentClasses: parseInt(rawData.attendance.present.replace(/[^0-9]/g, '')) || 0,
                absentClasses: parseInt(rawData.attendance.absent.replace(/[^0-9]/g, '')) || 0,

                caMarks: (rawData.caMarks || []).map((m: any) => ({
                    courseName: this.sanitize(m.courseName),
                    assignmentMarks: this.sanitize(m.assignmentMarks),
                    assessmentMarks: this.sanitize(m.assessmentMarks),
                    total: this.sanitize(m.total)
                })),

                timetable: (rawData.timetable || []).map((t: any) => ({
                    subject: this.sanitize(t.subject),
                    faculty: this.sanitize(t.faculty),
                    room: this.sanitize(t.room),
                    time: this.sanitize(t.time)
                })),

                holidays: (rawData.holidays || []).map((h: any) => ({
                    name: this.sanitize(h.name),
                    date: this.sanitize(h.date)
                }))
            };

            // Final Validation Layer
            const allValues = [
                sanitizedData.studentName, sanitizedData.systemId, 
                sanitizedData.program, sanitizedData.school,
                ...sanitizedData.caMarks.flatMap((m: any) => Object.values(m)),
                ...sanitizedData.timetable.flatMap((t: any) => Object.values(t)),
                ...sanitizedData.holidays.flatMap((h: any) => Object.values(h))
            ];

            if (allValues.some(v => !this.isValidValue(v))) {
                throw new Error('Data validation failed: Extracted data contains technical fragments or CSS/JS code. Sync aborted to prevent data corruption.');
            }

            logger.info('[EZONE] Strict Extracted Data:', sanitizedData);
            return sanitizedData;

        } catch (error: any) {
            logger.error('Failed to extract Ezone data:', error);
            throw new Error(`Extraction Error: ${error.message}`);
        }
    }

    /**
     * Handle mandatory popups, feedback forms, or modals that block the dashboard
     */
    private async handlePopups(page: Page, userId?: string, organizationId?: string, sessionId?: string, firebaseUid?: string): Promise<void> {
        const ezoneLogger = (await import('../services/ezone-logger.service')).EzoneLogger.getInstance();
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
                    if (userId && organizationId && sessionId) {
                        await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'warning', `Blocking popup detected (${selector}). Attempting to bypass...`, { category: 'EXTRACTION', actionType: 'popup.close' }, firebaseUid);
                    }
                    await btn.click();
                    await page.waitForTimeout(1000);
                }
            }
        } catch (err) {
            logger.error('Error while handling popups:', err);
        }
    }
}
