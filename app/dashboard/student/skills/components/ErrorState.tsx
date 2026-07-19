'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
        <AlertCircle className="w-10 h-10 text-red-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Unable to Load Skills</h3>
      <p className="text-slate-400 max-w-md mx-auto mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}
