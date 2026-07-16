export interface NormalizedEvent {
  type: string;
  timeSlot: string;
  courseCode: string;
  courseName: string;
  room: string;
  instructor: string;
  isHoliday: boolean;
}

export interface NormalizedDay {
  date: string;
  events: NormalizedEvent[];
}

/**
 * Safely normalizes timetable schedule data, guarding against missing/non-array events,
 * null values, empty objects, and partial event properties.
 */
export function normalizeSchedule(rawSchedule: any): NormalizedDay[] {
  const schedule = Array.isArray(rawSchedule) ? rawSchedule : [];
  return schedule
    .map((day: any) => {
      if (!day || typeof day !== 'object') return null;
      const date = day.date ? String(day.date) : 'Unknown Date';
      const rawEvents = day.events;
      const events = Array.isArray(rawEvents) ? rawEvents : [];

      const normalizedEvents = events
        .map((ev: any) => {
          if (!ev || typeof ev !== 'object') return null;
          return {
            type: ev.type ? String(ev.type) : '',
            timeSlot: ev.timeSlot ? String(ev.timeSlot) : 'No Time',
            courseCode: ev.courseCode ? String(ev.courseCode) : '',
            courseName: ev.courseName ? String(ev.courseName) : 'No Course Name',
            room: ev.room ? String(ev.room) : 'No Room',
            instructor: ev.instructor ? String(ev.instructor) : 'No Instructor',
            isHoliday: ev.type === 'Holiday',
          };
        })
        .filter(Boolean) as NormalizedEvent[];

      return {
        date,
        events: normalizedEvents,
      };
    })
    .filter(Boolean) as NormalizedDay[];
}
