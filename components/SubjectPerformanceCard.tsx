import React from 'react';

// Types duplicated for self‑containment
export type GrowthMetricState = 'AVAILABLE' | 'EMPTY' | 'NOT_CONNECTED' | 'NOT_SYNCED' | 'UNAVAILABLE' | 'ERROR';
export type GrowthMetricReasonCode = 'NO_DATA' | 'NOT_CONNECTED' | 'NOT_SYNCED' | 'UNAVAILABLE' | 'AUTH_REQUIRED' | 'ORG_REQUIRED' | 'SOURCE_ERROR' | 'UNKNOWN';
export type GrowthMetric<T> = {
  state: GrowthMetricState;
  value: T | null;
  updatedAt: string | null;
  stale: boolean | null;
  reasonCode: GrowthMetricReasonCode | null;
};

export type SubjectPerformance = {
  subjectId: string;
  averageMarks: number;
  count: number;
};

const isMetricValuePresent = <T,>(value: T | null | undefined): value is T => value !== null && value !== undefined;

const describeState = (metric: GrowthMetric<unknown>) => {
  switch (metric.state) {
    case 'AVAILABLE':
      return 'Available';
    case 'EMPTY':
      return 'No data yet';
    case 'NOT_CONNECTED':
      return 'Not connected';
    case 'NOT_SYNCED':
      return 'Not synced';
    case 'UNAVAILABLE':
    case 'ERROR':
    default:
      return 'Unavailable';
  }
};

interface SubjectPerformanceCardProps {
  subjectWisePerformance: GrowthMetric<SubjectPerformance[]>;
}

export const SubjectPerformanceCard: React.FC<SubjectPerformanceCardProps> = ({ subjectWisePerformance }) => {
  return (
    <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-emerald-400">Subject performance</h2>
          <p className="text-sm text-slate-400">Real subject averages from your verified marks data.</p>
        </div>
        <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
          {describeState(subjectWisePerformance)}
        </span>
      </div>
      {subjectWisePerformance.state === 'AVAILABLE' && subjectWisePerformance.value?.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {subjectWisePerformance.value.map((item) => (
            <div key={item.subjectId} className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">{item.subjectId}</h3>
                <span className="text-sm text-emerald-300">{item.averageMarks.toFixed(2)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {item.count} recorded mark{item.count === 1 ? '' : 's'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-400">No subject‑wise marks are available yet.</p>
      )}
    </div>
  );
};
