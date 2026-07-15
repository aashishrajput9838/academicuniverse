import React from 'react';

// Local type copies for self‑containment
export type GrowthMetricState = 'AVAILABLE' | 'EMPTY' | 'NOT_CONNECTED' | 'NOT_SYNCED' | 'UNAVAILABLE' | 'ERROR';
export type GrowthMetricReasonCode = 'NO_DATA' | 'NOT_CONNECTED' | 'NOT_SYNCED' | 'UNAVAILABLE' | 'AUTH_REQUIRED' | 'ORG_REQUIRED' | 'SOURCE_ERROR' | 'UNKNOWN';
export type GrowthMetric<T> = {
  state: GrowthMetricState;
  value: T | null;
  updatedAt: string | null;
  stale: boolean | null;
  reasonCode: GrowthMetricReasonCode | null;
};

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

const formatStatusValue = (metric: GrowthMetric<string>) => {
  if (metric.state === 'AVAILABLE' && metric.value !== null && metric.value !== undefined) {
    return metric.value;
  }
  if (metric.state === 'EMPTY') {
    return 'No academic profile status yet';
  }
  if (metric.state === 'NOT_SYNCED') {
    return 'Not synced';
  }
  return 'Unavailable';
};

interface AcademicProfileCardProps {
  academicProfileStatus: GrowthMetric<string>;
}

export const AcademicProfileCard: React.FC<AcademicProfileCardProps> = ({ academicProfileStatus }) => {
  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-emerald-400">Academic profile</h2>
          <p className="text-sm text-slate-400">Latest profile status from the connected academic source.</p>
        </div>
        <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
          {describeState(academicProfileStatus)}
        </span>
      </div>
      <p className="mt-6 text-lg font-semibold text-white">
        {formatStatusValue(academicProfileStatus)}
      </p>
    </div>
  );
};
