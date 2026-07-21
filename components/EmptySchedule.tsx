import React from 'react';

interface EmptyScheduleProps {
  message?: string;
  subMessage?: string;
}

export const EmptySchedule: React.FC<EmptyScheduleProps> = ({
  message = 'No classes scheduled',
  subMessage,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-600 mb-3"
      >
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
      <p className="text-slate-400 text-sm font-medium">{message}</p>
      {subMessage && <p className="text-slate-500 text-xs mt-1">{subMessage}</p>}
    </div>
  );
};
