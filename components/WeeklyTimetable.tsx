import React from 'react';
import { ScheduleDay } from '@/lib/utils/timetable';
import { TimetableCard } from '@/components/TimetableCard';
import { TimetableGrid } from '@/components/TimetableGrid';
import {
  getCurrentWeekDates,
  sortEventsByTime,
  DAY_NAMES,
} from '@/lib/utils/timetable';

interface WeeklyTimetableProps {
  schedule: ScheduleDay[];
}

export const WeeklyTimetable: React.FC<WeeklyTimetableProps> = ({ schedule }) => {
  const weekDates = getCurrentWeekDates();

  const visibleDays = weekDates
    .map((wd) => {
      const matchingDays = schedule.filter((d) => d.date === wd.date);
      return { ...wd, days: matchingDays };
    })
    .filter((wd) => wd.days.length > 0);

  const allTimeSlots = new Set<string>();
  for (const day of schedule) {
    for (const event of day.events) {
      const trimmed = event.timeSlot.trim();
      if (trimmed) allTimeSlots.add(trimmed);
    }
  }

  const sortedTimeSlots = Array.from(allTimeSlots).sort((a, b) => {
    const aParsed = a.match(/(\d{1,2}):(\d{2})/);
    const bParsed = b.match(/(\d{1,2}):(\d{2})/);
    if (!aParsed && !bParsed) return 0;
    if (!aParsed) return 1;
    if (!bParsed) return -1;
    const aMinutes = parseInt(aParsed[1], 10) * 60 + parseInt(aParsed[2], 10);
    const bMinutes = parseInt(bParsed[1], 10) * 60 + parseInt(bParsed[2], 10);
    return aMinutes - bMinutes;
  });

  if (visibleDays.length === 0 && sortedTimeSlots.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-8 text-center">
        <p className="text-slate-400 text-sm">No timetable data available for this week.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile: show cards grouped by day */}
      <div className="lg:hidden space-y-4">
        {visibleDays.map((wd) => (
          <div
            key={wd.date}
            className="rounded-xl border border-slate-700/50 bg-slate-800/20 overflow-hidden"
          >
            <div className="bg-slate-800/40 px-4 py-2 border-b border-slate-700/50">
              <p className="text-sm font-semibold text-white">
                {DAY_NAMES[wd.dayIndex] ?? wd.date}
              </p>
            </div>
            <div className="p-4 space-y-3">
              {wd.days.flatMap((d) => sortEventsByTime(d.events)).map((event, idx) => (
                <div key={idx}>
                  <p className="text-xs font-mono text-emerald-400 mb-1">{event.timeSlot}</p>
                  <TimetableCard event={event} compact />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: full grid */}
      <div className="hidden lg:block">
        <TimetableGrid days={schedule} timeSlots={sortedTimeSlots} />
      </div>
    </div>
  );
};
