import React from 'react';

// Duplicate minimal types from the page for self‑containment
export type GrowthMetricState = 'AVAILABLE' | 'EMPTY' | 'NOT_CONNECTED' | 'NOT_SYNCED' | 'UNAVAILABLE' | 'ERROR';
export type GrowthMetricReasonCode = 'NO_DATA' | 'NOT_CONNECTED' | 'NOT_SYNCED' | 'UNAVAILABLE' | 'AUTH_REQUIRED' | 'ORG_REQUIRED' | 'SOURCE_ERROR' | 'UNKNOWN';
export type GrowthMetric<T> = {
  state: GrowthMetricState;
  value: T | null;
  updatedAt: string | null;
  stale: boolean | null;
  reasonCode: GrowthMetricReasonCode | null;
};

interface MarksOverviewCardProps {
  marksSummary: GrowthMetric<number>;
  averageMarks: GrowthMetric<number>;
}

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

const formatMetricValue = (metric: GrowthMetric<number>, label: string) => {
  if (metric.state === 'AVAILABLE' && isMetricValuePresent(metric.value)) {
    return `${metric.value}${label}`;
  }
  if (metric.state === 'EMPTY') return 'No data yet';
  if (metric.state === 'NOT_SYNCED') return 'Not synced';
  if (metric.state === 'NOT_CONNECTED') return 'Not connected';
  return 'Unavailable';
};

export const MarksOverviewCard: React.FC<MarksOverviewCardProps> = ({ marksSummary, averageMarks }) => {
  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-emerald-400">Marks overview</h2>
          <p className="text-sm text-slate-400">Verified marks recorded for your current organization.</p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-300">
          {describeState(marksSummary)}
        </span>
      </div>
      <div className="mt-6 space-y-4">
        <div>
          <p className="text-sm text-slate-400">Recorded mark entries</p>
          <p className="mt-1 text-3xl font-semibold text-white">
            {marksSummary.state === 'AVAILABLE' && isMetricValuePresent(marksSummary.value)
              ? marksSummary.value
              : 'No data'}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Average marks</p>
          <p className="mt-1 text-3xl font-semibold text-white">
            {formatMetricValue(averageMarks, '')}
          </p>
        </div>
      </div>
    </div>
  );
};
