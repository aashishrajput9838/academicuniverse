'use client';

interface DraftIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: Date | null;
  onRetry?: () => void;
}

export function DraftIndicator({ status, lastSavedAt, onRetry }: DraftIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  const config = {
    idle: { dot: 'bg-slate-500', text: '', show: false },
    saving: { dot: 'bg-yellow-500 animate-pulse', text: 'Saving...', show: true },
    saved: { dot: 'bg-emerald-500', text: 'Saved', show: true },
    error: { dot: 'bg-red-500', text: 'Save failed', show: true },
  }[status];

  if (!config.show) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span>{config.text}</span>
      {lastSavedAt && status === 'saved' && (
        <span className="text-slate-500">
          · {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      {status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="text-emerald-400 hover:text-emerald-300 underline ml-1"
        >
          Retry
        </button>
      )}
    </div>
  );
}
