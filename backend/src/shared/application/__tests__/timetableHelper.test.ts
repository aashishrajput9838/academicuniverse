import { normalizeSchedule } from '../timetableHelper';

describe('normalizeSchedule', () => {
  it('should handle a valid timetable structure', () => {
    const raw = [
      {
        date: '2026-07-16',
        events: [
          {
            timeSlot: '09:00 - 10:00',
            courseCode: 'CSE101',
            courseName: 'Intro to CS',
            room: '101',
            instructor: 'Dr. Smith',
            type: 'Lecture',
          },
        ],
      },
    ];

    const res = normalizeSchedule(raw);
    expect(res).toHaveLength(1);
    expect(res[0].date).toBe('2026-07-16');
    expect(res[0].events).toHaveLength(1);
    expect(res[0].events[0]).toEqual({
      type: 'Lecture',
      timeSlot: '09:00 - 10:00',
      courseCode: 'CSE101',
      courseName: 'Intro to CS',
      room: '101',
      instructor: 'Dr. Smith',
      isHoliday: false,
    });
  });

  it('should handle events undefined', () => {
    const raw = [
      {
        date: '2026-07-16',
      },
    ];

    const res = normalizeSchedule(raw);
    expect(res).toHaveLength(1);
    expect(res[0].date).toBe('2026-07-16');
    expect(res[0].events).toEqual([]);
  });

  it('should handle events null', () => {
    const raw = [
      {
        date: '2026-07-16',
        events: null,
      },
    ];

    const res = normalizeSchedule(raw);
    expect(res).toHaveLength(1);
    expect(res[0].date).toBe('2026-07-16');
    expect(res[0].events).toEqual([]);
  });

  it('should handle empty schedule', () => {
    const raw: any[] = [];
    const res = normalizeSchedule(raw);
    expect(res).toEqual([]);
  });

  it('should handle malformed AI response (not an array, non-object elements, etc.)', () => {
    // 1. rawSchedule not an array
    expect(normalizeSchedule(null)).toEqual([]);
    expect(normalizeSchedule({})).toEqual([]);
    expect(normalizeSchedule('timetable')).toEqual([]);

    // 2. Schedule elements not objects
    const rawElements = [null, undefined, 'string', 123];
    expect(normalizeSchedule(rawElements)).toEqual([]);

    // 3. Events not array (e.g. object, string, number)
    const rawEventsMalformed = [
      {
        date: '2026-07-16',
        events: 'no-events',
      },
      {
        date: '2026-07-17',
        events: { timeSlot: '12:00' },
      },
    ];
    const res2 = normalizeSchedule(rawEventsMalformed);
    expect(res2).toHaveLength(2);
    expect(res2[0].events).toEqual([]);
    expect(res2[1].events).toEqual([]);
  });

  it('should handle partial event objects', () => {
    const raw = [
      {
        date: '2026-07-16',
        events: [
          {
            courseName: 'Partially Extracted Course',
          },
          {
            type: 'Holiday',
          },
        ],
      },
    ];

    const res = normalizeSchedule(raw);
    expect(res).toHaveLength(1);
    expect(res[0].events).toHaveLength(2);
    expect(res[0].events[0]).toEqual({
      type: '',
      timeSlot: 'No Time',
      courseCode: '',
      courseName: 'Partially Extracted Course',
      room: 'No Room',
      instructor: 'No Instructor',
      isHoliday: false,
    });
    expect(res[0].events[1].isHoliday).toBe(true);
  });
});
