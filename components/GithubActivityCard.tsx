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

interface GithubActivityCardProps {
  githubRepositoryCount: GrowthMetric<number>;
  completedProjects: GrowthMetric<number>;
}

export const GithubActivityCard: React.FC<GithubActivityCardProps> = ({ githubRepositoryCount, completedProjects }) => {
  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-emerald-400">GitHub activity</h2>
          <p className="text-sm text-slate-400">Repository and project counts from your connected GitHub profile.</p>
        </div>
        <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
          {describeState(githubRepositoryCount)}
        </span>
      </div>
      <div className="mt-6 space-y-4">
        <div>
          <p className="text-sm text-slate-400">Repositories</p>
          <p className="mt-1 text-3xl font-semibold text-white">
            {githubRepositoryCount.state === 'AVAILABLE' && isMetricValuePresent(githubRepositoryCount.value)
              ? githubRepositoryCount.value
              : 'Not available'}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Completed projects</p>
          <p className="mt-1 text-3xl font-semibold text-white">
            {completedProjects.state === 'AVAILABLE' && isMetricValuePresent(completedProjects.value)
              ? completedProjects.value
              : 'Not available'}
          </p>
        </div>
      </div>
    </div>
  );
};
