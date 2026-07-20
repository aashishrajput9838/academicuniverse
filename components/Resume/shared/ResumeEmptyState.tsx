'use client';

import { ReactNode } from 'react';

interface ResumeEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
}

export function ResumeEmptyState({ icon, title, description, action }: ResumeEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 text-slate-400">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-md mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            action.variant === 'secondary'
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
