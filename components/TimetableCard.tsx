import React from 'react';
import { ScheduleEvent } from '@/lib/utils/timetable';
import { Badge } from '@/components/ui/badge';

interface TimetableCardProps {
  event: ScheduleEvent;
  compact?: boolean;
}

export const TimetableCard: React.FC<TimetableCardProps> = ({ event, compact = false }) => {
  const padding = compact ? 'p-3' : 'p-4';
  const textSize = compact ? 'text-xs' : 'text-sm';

  return (
    <div className={`bg-slate-900/60 backdrop-blur-sm rounded-lg border border-slate-700/50 ${padding} transition hover:border-emerald-500/30 hover:bg-slate-900/80`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-white truncate ${compact ? 'text-sm' : 'text-base'}`}>
            {event.courseName}
          </p>
          <p className={`text-slate-400 mt-0.5 ${textSize}`}>
            {event.courseCode}
          </p>
        </div>
        {event.type && (
          <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wide">
            {event.type}
          </Badge>
        )}
      </div>

      <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 ${textSize}`}>
        <span className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {event.timeSlot}
        </span>
        <span className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {event.room}
        </span>
        <span className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="truncate">{event.instructor}</span>
        </span>
      </div>
    </div>
  );
};
