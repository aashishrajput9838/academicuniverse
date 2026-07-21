export interface ScheduleEvent {
  timeSlot: string;
  courseCode: string;
  courseName: string;
  room: string;
  instructor: string;
  type?: string;
}

export interface ScheduleDay {
  date: string;
  events: ScheduleEvent[];
}

export interface ParsedTimeSlot {
  startMinutes: number;
  endMinutes: number;
  start: string;
  end: string;
  raw: string;
}

export interface NextClassInfo {
  event: ScheduleEvent;
  day: ScheduleDay;
  minutesUntil: number;
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function parseTimeSlot(timeSlot: string): ParsedTimeSlot | null {
  const match = timeSlot.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const startHours = parseInt(match[1], 10);
  const startMinutes = parseInt(match[2], 10);
  const endHours = parseInt(match[3], 10);
  const endMinutes = parseInt(match[4], 10);

  return {
    startMinutes: startHours * 60 + startMinutes,
    endMinutes: endHours * 60 + endMinutes,
    start: `${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`,
    end: `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`,
    raw: timeSlot.trim(),
  };
}

export function sortEventsByTime(events: ScheduleEvent[]): ScheduleEvent[] {
  return [...events].sort((a, b) => {
    const aParsed = parseTimeSlot(a.timeSlot);
    const bParsed = parseTimeSlot(b.timeSlot);
    if (!aParsed && !bParsed) return 0;
    if (!aParsed) return 1;
    if (!bParsed) return -1;
    return aParsed.startMinutes - bParsed.startMinutes;
  });
}

export function getTodayEvents(schedule: ScheduleDay[]): ScheduleEvent[] {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const day = schedule.find((d) => d.date === todayStr);
  return sortEventsByTime(day?.events ?? []);
}

export function getNextEvent(schedule: ScheduleDay[]): NextClassInfo | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const upcoming: { day: ScheduleDay; event: ScheduleEvent; minutesUntil: number }[] = [];

  for (const day of schedule) {
    const dayDate = new Date(day.date + 'T00:00:00');
    if (dayDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) continue;

    const sorted = sortEventsByTime(day.events);
    for (const event of sorted) {
      const parsed = parseTimeSlot(event.timeSlot);
      if (!parsed) continue;

      let minutesUntil: number;
      if (day.date === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`) {
        minutesUntil = parsed.startMinutes - currentMinutes;
      } else {
        const diffMs = dayDate.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        minutesUntil = Math.floor(diffMs / (1000 * 60)) + parsed.startMinutes;
      }

      if (minutesUntil > -parsed.endMinutes + parsed.startMinutes) {
        upcoming.push({ day, event, minutesUntil });
      }
    }
  }

  upcoming.sort((a, b) => a.minutesUntil - b.minutesUntil);
  return upcoming.length > 0 ? upcoming[0] : null;
}

export function getDayOfWeek(dateString: string): number {
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return -1;
  return date.getDay();
}

export function getDayName(dayIndex: number): string {
  return DAY_NAMES[dayIndex] ?? 'Unknown';
}

export function getDayShort(dayIndex: number): string {
  return DAY_SHORT[dayIndex] ?? '???';
}

export function getCurrentWeekDates(): { date: string; dayIndex: number }[] {
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

export function groupScheduleByDayOfWeek(schedule: ScheduleDay[]): Map<number, ScheduleDay[]> {
  const grouped = new Map<number, ScheduleDay[]>();
  for (const day of schedule) {
    const dayIndex = getDayOfWeek(day.date);
    if (dayIndex < 0) continue;
    const existing = grouped.get(dayIndex) ?? [];
    existing.push(day);
    grouped.set(dayIndex, existing);
  }
  return grouped;
}

export function formatTimeRemaining(minutes: number): string {
  if (minutes < 0) return 'Started';
  if (minutes === 0) return 'Starting now';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}
