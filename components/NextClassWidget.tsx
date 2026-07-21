import React from 'react';
import { NextClassInfo } from '@/lib/utils/timetable';
import { TimetableCard } from '@/components/TimetableCard';
import { EmptySchedule } from '@/components/EmptySchedule';
import { formatTimeRemaining } from '@/lib/utils/timetable';
import { formatDateForDisplay } from '@/lib/utils/dateNormalizer';

interface NextClassWidgetProps {
  nextClass: NextClassInfo | null;
}

export const NextClassWidget: React.FC<NextClassWidgetProps> = ({ nextClass }) => {
  if (!nextClass) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 overflow-hidden">
        <div className="bg-slate-800/40 px-4 py-3 border-b border-slate-700/50">
          <h3 className="text-sm font-semibold text-white">Next Class</h3>
        </div>
        <div className="p-4">
          <EmptySchedule message="No more classes today." subMessage="Your schedule is clear for the rest of the day." />
        </div>
      </div>
    );
  }

  const { event, day, minutesUntil } = nextClass;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
      <div className="bg-emerald-500/10 px-4 py-3 border-b border-emerald-500/20 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-300">Next Class</h3>
        {minutesUntil > 0 && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
            In {formatTimeRemaining(minutesUntil)}
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          {formatDateForDisplay(day.date)}
        </div>

        <TimetableCard event={event} compact={false} />

        {minutesUntil <= 0 && minutesUntil > -120 && (
          <p className="mt-2 text-xs text-amber-400 font-medium">Class is in progress</p>
        )}
      </div>
    </div>
  );
};
