import React from 'react';
import { ScheduleDay } from '@/lib/utils/timetable';
import { TimetableCard } from '@/components/TimetableCard';
import { DAY_NAMES, DAY_SHORT, getDayOfWeek } from '@/lib/utils/timetable';

interface TimetableGridProps {
  days: ScheduleDay[];
  timeSlots: string[];
}

interface DayHeader {
  dayIndex: number;
  date: string;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({ days, timeSlots }) => {
  if (timeSlots.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-8 text-center">
        <p className="text-slate-400 text-sm">No time slots found in schedule.</p>
      </div>
    );
  }

  const dayIndexToDate = new Map<number, ScheduleDay[]>();
  for (const day of days) {
    const dayIndex = getDayOfWeek(day.date);
    if (dayIndex >= 0) {
      const existing = dayIndexToDate.get(dayIndex) ?? [];
      existing.push(day);
      dayIndexToDate.set(dayIndex, existing);
    }
  }

  const visibleDays: DayHeader[] = [];
  for (let d = 1; d <= 6; d++) {
    const daysForIndex = dayIndexToDate.get(d);
    if (daysForIndex && daysForIndex.length > 0) {
      visibleDays.push({ dayIndex: d, date: daysForIndex[0].date });
    }
  }

  const getEventsForCell = (dayIndex: number, timeSlot: string): { event: any; day: ScheduleDay } | null => {
    const daysForIndex = dayIndexToDate.get(dayIndex);
    if (!daysForIndex) return null;
    for (const day of daysForIndex) {
      const match = day.events.find((e) => e.timeSlot === timeSlot);
      if (match) return { event: match, day };
    }
    return null;
  };

  const formatShortDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/40">
              <th className="h-12 px-3 text-left align-middle font-medium text-slate-400 w-24 shrink-0">
                Time
              </th>
              {visibleDays.map(({ dayIndex, date }) => (
                <th
                  key={dayIndex}
                  className="h-12 px-3 text-center align-middle font-medium text-slate-300 min-w-[140px]"
                >
                  <div>{DAY_NAMES[dayIndex]}</div>
                  <div className="text-[10px] text-slate-500 font-normal normal-case">
                    {formatShortDate(date)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((timeSlot) => (
              <tr key={timeSlot} className="border-b border-slate-700/30 last:border-0">
                <td className="px-3 py-3 text-xs font-mono text-slate-400 align-top w-24 shrink-0">
                  {timeSlot}
                </td>
                {visibleDays.map(({ dayIndex }) => {
                  const cell = getEventsForCell(dayIndex, timeSlot);
                  return (
                    <td
                      key={dayIndex}
                      className="px-2 py-2 align-top min-w-[140px]"
                    >
                      {cell ? (
                        <TimetableCard event={cell.event} compact />
                      ) : (
                        <div className="h-12" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
