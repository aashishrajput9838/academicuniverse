import { AcademicSchedule } from '../../../models/AcademicSchedule';
import { PersonResolver } from '../../../shared/services/personResolver.service';
import { Logger } from '../../../shared/utils';
import mongoose from 'mongoose';
import { toObjectId } from '../../../utils/mongooseHelpers';

const logger = new Logger('EzoneAcademicScheduleSync');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export class EzoneAcademicScheduleSyncService {
    async syncTimetable(
        userId: string,
        organizationId: string,
        timetable: any[],
        userEmail?: string,
        userName?: string
    ): Promise<{ created: number; updated: number; skipped: number }> {
        if (!Array.isArray(timetable) || timetable.length === 0) {
            logger.info('No timetable data to sync to AcademicSchedule');
            return { created: 0, updated: 0, skipped: 0 };
        }

        const personResolver = new PersonResolver();
        const personId = await personResolver.resolve(userId, organizationId, userEmail, userName);

        const schedule = this.transformTimetable(timetable);
        const totalEvents = schedule.reduce((sum, day) => sum + day.events.length, 0);

        if (totalEvents === 0) {
            logger.info('Timetable transformed to empty schedule, skipping AcademicSchedule sync');
            return { created: 0, updated: 0, skipped: 0 };
        }

        const orgOid = toObjectId(organizationId);
        const personOid = toObjectId(personId);

        const result = await AcademicSchedule.findOneAndUpdate(
            { organizationId: orgOid, personId: personOid },
            {
                $set: {
                    sourceProcessingId: `ezone-sync-${Date.now()}`,
                    rawConfidence: 1.0,
                    schedule,
                    approvedBy: userId,
                    approvedAt: new Date(),
                }
            },
            { upsert: true, new: true }
        );

        const action = result ? 'updated' : 'created';
        logger.info(`[ACADEMIC_SCHEDULE_SYNC] ${action} schedule for user ${userId}: ${schedule.length} days, ${totalEvents} events`);

        return {
            created: result ? 1 : 0,
            updated: result ? 1 : 0,
            skipped: 0
        };
    }

    private transformTimetable(timetable: any[]): any[] {
        const weekDates = getCurrentWeekDates();
        const dayNameToDate = new Map<string, string>();
        for (const wd of weekDates) {
            dayNameToDate.set(DAY_NAMES[wd.dayIndex], wd.date);
        }

        const dayMap = new Map<string, any[]>();

        for (const entry of timetable) {
            const date = this.extractDate(entry.day);
            if (!date) continue;

            const timeSlot = (entry.time || '').trim();
            if (!timeSlot) continue;

            const courseCode = (entry.courseCode || '').trim();
            const subject = (entry.subject || '').trim();
            const courseName = subject || courseCode || 'Unknown Course';
            const instructor = (entry.faculty || '').trim();
            const room = (entry.room || '').trim();

            if (!dayMap.has(date)) {
                dayMap.set(date, []);
            }

            dayMap.get(date)!.push({
                timeSlot,
                courseCode: courseCode || undefined,
                courseName,
                room,
                instructor,
            });
        }

        const schedule: any[] = [];
        for (const [date, events] of dayMap) {
            schedule.push({
                date,
                events: events.sort((a, b) => compareTimeSlots(a.timeSlot, b.timeSlot)),
            });
        }

        return schedule.sort((a, b) => a.date.localeCompare(b.date));
    }

    private extractDate(day: any): string | null {
        if (!day) return null;
        const trimmed = String(day).trim();
        if (!trimmed) return null;

        // Already ISO format
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return trimmed;
        }

        // Full date strings like "Mon, July 20, 2026" or "Monday, July 20, 2026"
        const commaMatch = trimmed.match(/^[A-Za-z]+,\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})$/);
        if (commaMatch) {
            const parsed = new Date(commaMatch[1]);
            if (!isNaN(parsed.getTime())) {
                return formatDate(parsed);
            }
        }

        // Try native date parsing
        const nativeDate = new Date(trimmed);
        if (!isNaN(nativeDate.getTime())) {
            return formatDate(nativeDate);
        }

        // Day name mapping to current week
        const dayName = trimmed.split(',')[0].trim();
        const lowerDayName = dayName.toLowerCase();
        const matchedIndex = DAY_NAMES.findIndex(d => d.toLowerCase() === lowerDayName || d.toLowerCase().startsWith(lowerDayName));
        
        if (matchedIndex >= 0) {
            const weekDates = getCurrentWeekDates();
            for (const wd of weekDates) {
                if (wd.dayIndex === matchedIndex) {
                    return wd.date;
                }
            }
        }

        return null;
    }
}

function getCurrentWeekDates(): { date: string; dayIndex: number }[] {
    const today = new Date();
    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);

    const dates: { date: string; dayIndex: number }[] = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dates.push({ date: dateStr, dayIndex: d.getDay() });
    }
    return dates;
}

function compareTimeSlots(a: string, b: string): number {
    const parse = (ts: string) => {
        const match = ts.match(/(\d{1,2}):(\d{2})/);
        if (!match) return -1;
        return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    };
    return parse(a) - parse(b);
}

function formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
