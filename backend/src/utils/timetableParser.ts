import * as xlsx from 'xlsx';
const pdfParse = require('pdf-parse');
import * as fs from 'fs';
import * as path from 'path';
import { IParsedSlot } from '../models/Timetable';
import { Logger } from './logger';

const logger = new Logger('timetableParser');

export class TimetableParser {
    /**
     * Parses an Excel buffer into an array of IParsedSlot.
     * Note: This assumes a very specific simple layout:
     * [DayOfWeek] [StartTime] [EndTime] [Subject]
     * 
     * In a production environment, this parsing logic would be 
     * extremely sophisticated and mapped to the institution's 
     * exact template layout.
     */
    static parseExcel(buffer: Buffer): IParsedSlot[] {
        try {
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert sheet to a JSON array of rows
            const data: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            const parsedSlots: IParsedSlot[] = [];

            if (data.length < 2) return [];

            // 1. Find the header row that contains time slots
            let timeSlots: string[] = [];
            let headerRowIndex = -1;

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                if (row && row.some(cell => String(cell).toLowerCase().includes('hours'))) {
                    headerRowIndex = i;
                    // Extract time slots (skipping the first "Hours" column)
                    timeSlots = row.slice(1).map(cell => String(cell || '').trim());
                    break;
                }
            }

            if (headerRowIndex === -1 || timeSlots.length === 0) {
                logger.warn('Could not find header row with time slots');
                return [];
            }

            // 2. Process rows starting with a day/date
            const dayMap: { [key: string]: string } = {
                'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday',
                'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday'
            };

            for (let i = headerRowIndex + 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0) continue;

                const firstCell = String(row[0] || '').toLowerCase();
                let currentDay = '';

                for (const shortDay in dayMap) {
                    if (firstCell.startsWith(shortDay)) {
                        currentDay = dayMap[shortDay];
                        break;
                    }
                }

                if (!currentDay) continue;

                // Handle Holidays
                if (row.some(cell => String(cell).toLowerCase().includes('holiday'))) {
                    continue; // Skip holidays for now or mark as free
                }

                // Process each column matching a time slot
                for (let j = 1; j < row.length; j++) {
                    const subject = String(row[j] || '').trim();
                    const timeRange = timeSlots[j - 1];

                    if (subject && timeRange && subject !== 'null') {
                        // Split "09:00:00 - 09:50:00"
                        const times = timeRange.split(/\s+-\s+|\s+to\s+/i);
                        const startTime = times[0] ? times[0].substring(0, 5) : '00:00';
                        const endTime = times[1] ? times[1].substring(0, 5) : '00:00';

                        parsedSlots.push({
                            dayOfWeek: currentDay,
                            startTime,
                            endTime,
                            subject: subject,
                            isFreeSlot: subject.toLowerCase().includes('free')
                        });
                    }
                }
            }

            logger.info(`Successfully parsed ${parsedSlots.length} slots from Excel.`);
            return parsedSlots;
        } catch (error) {
            logger.error('Failed to parse Excel timetable:', error);
            throw new Error('Could not extract data from the provided Excel file.');
        }
    }

    /**
     * Legacy helper - now unused but kept for interface consistency if needed.
     */
    private static extractSlotsFromRow(row: any[], dayOfWeek: string): IParsedSlot[] {
        return [];
    }

    /**
     * Parses a PDF buffer into an array of IParsedSlot.
     * Text extraction from PDFs is unstructured, so this uses regex
     * to find patterns approximating schedule slots.
     */
    static async parsePdf(buffer: Buffer): Promise<IParsedSlot[]> {
        try {
            const data = await pdfParse(buffer);
            const text = data.text;
            const parsedSlots: IParsedSlot[] = [];

            // Example Logic: Looking for "Monday 09:00 - 10:00 Subject"
            // Note: Realistic PDF layouts require AI/OCR or heavily mapped bounds.
            const lines = text.split('\n');
            const daysOfWeekRegex = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i;
            const timeRegex = /(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})/i;

            let currentDay = '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                const dayMatch = trimmed.match(daysOfWeekRegex);
                if (dayMatch) {
                    currentDay = dayMatch[1];
                }

                const timeMatch = trimmed.match(timeRegex);
                if (timeMatch && currentDay) {
                    const startTime = timeMatch[1];
                    const endTime = timeMatch[2];

                    // Remove the time from the line to find the subject
                    const remainingText = trimmed.replace(timeMatch[0], '').replace(daysOfWeekRegex, '').trim();

                    // Clean up the subject string
                    const subjectMatch = remainingText.replace(/^[\s-:]+/, '');

                    if (subjectMatch) {
                        parsedSlots.push({
                            dayOfWeek: currentDay.charAt(0).toUpperCase() + currentDay.slice(1).toLowerCase(),
                            startTime,
                            endTime,
                            subject: subjectMatch,
                            isFreeSlot: subjectMatch.toLowerCase().includes('free')
                        });
                    }
                }
            }

            logger.info(`Successfully parsed ${parsedSlots.length} slots from PDF check.`);
            return parsedSlots;
        } catch (error) {
            logger.error('Failed to parse PDF timetable:', error);
            throw new Error('Could not extract data from the provided PDF file.');
        }
    }
}
