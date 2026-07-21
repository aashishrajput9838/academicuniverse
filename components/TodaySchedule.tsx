import React from 'react';
import { ScheduleEvent } from '@/lib/utils/timetable';
import { TimetableCard } from '@/components/TimetableCard';
import { EmptySchedule } from '@/components/EmptySchedule';
import { formatDateForDisplay } from '@/lib/utils/dateNormalizer';

interface TodayScheduleProps {
  events: ScheduleEvent[];
  date?: string;
}

export const TodaySchedule: React.FC<TodayScheduleProps> = ({ events, date }) => {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 overflow-hidden">
      <div className="bg-slate-800/40 px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Today&apos;s Schedule</h3>
          {date && (
            <p className="text-xs text-slate-400 mt-0.5">{formatDateForDisplay(date)}</p>
          )}
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
          {events.length} {events.length === 1 ? 'class' : 'classes'}
        </span>
      </div>

      <div className="p-4">
        {events.length === 0 ? (
          <EmptySchedule message="No classes scheduled today." subMessage="Enjoy your free time!" />
        ) : (
          <div className="space-y-3">
            {events.map((event, idx) => (
              <TimetableCard key={idx} event={event} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
