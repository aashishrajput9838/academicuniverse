'use client';

interface ResumeSkeletonProps {
  count?: number;
  variant?: 'card' | 'form' | 'preview';
}

export function ResumeSkeleton({ count = 6, variant = 'card' }: ResumeSkeletonProps) {
  if (variant === 'form') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-slate-700 rounded w-1/4 animate-pulse" />
            <div className="h-10 bg-slate-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'preview') {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-700 rounded w-1/3 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 bg-slate-800 rounded animate-pulse" style={{ width: `${Math.random() * 40 + 60}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 space-y-3">
          <div className="h-5 bg-slate-700 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-slate-700 rounded w-1/2 animate-pulse" />
          <div className="h-4 bg-slate-700 rounded w-1/4 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
