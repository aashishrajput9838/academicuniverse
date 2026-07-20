'use client';

import { ReactNode } from 'react';

interface ResumeErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export function ResumeErrorState({ error, onRetry, onGoHome }: ResumeErrorStateProps) {
  const message = error instanceof Error ? error.message : error;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 text-red-400">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
      <p className="text-slate-400 text-sm max-w-md mb-6">{message}</p>
      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            Try Again
          </button>
        )}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors border border-slate-600"
          >
            Go Home
          </button>
        )}
      </div>
    </div>
  );
}
