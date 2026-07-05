'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

type GrowthMetricState = 'AVAILABLE' | 'EMPTY' | 'NOT_CONNECTED' | 'NOT_SYNCED' | 'UNAVAILABLE' | 'ERROR';
type GrowthMetricReasonCode = 'NO_DATA' | 'NOT_CONNECTED' | 'NOT_SYNCED' | 'UNAVAILABLE' | 'AUTH_REQUIRED' | 'ORG_REQUIRED' | 'SOURCE_ERROR' | 'UNKNOWN';

type GrowthMetric<T> = {
  state: GrowthMetricState;
  value: T | null;
  updatedAt: string | null;
  stale: boolean | null;
  reasonCode: GrowthMetricReasonCode | null;
};

type SubjectPerformance = {
  subjectId: string;
  averageMarks: number;
  count: number;
};

type GrowthResponse = {
  generatedAt: string;
  metrics: {
    marksSummary: GrowthMetric<number>;
    averageMarks: GrowthMetric<number>;
    subjectWisePerformance: GrowthMetric<SubjectPerformance[]>;
    attendance: GrowthMetric<number>;
    academicProfileStatus: GrowthMetric<string>;
    githubRepositoryCount: GrowthMetric<number>;
    completedProjects: GrowthMetric<number>;
  };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

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
      return 'Unavailable';
    case 'ERROR':
      return 'Unavailable';
    default:
      return 'Unavailable';
  }
};

const formatMetricValue = (metric: GrowthMetric<number>, label: string) => {
  if (metric.state === 'AVAILABLE' && isMetricValuePresent(metric.value)) {
    return `${metric.value}${label}`;
  }

  if (metric.state === 'EMPTY') {
    return 'No data yet';
  }

  if (metric.state === 'NOT_SYNCED') {
    return 'Not synced';
  }

  if (metric.state === 'NOT_CONNECTED') {
    return 'Not connected';
  }

  return 'Unavailable';
};

const formatAttendanceValue = (metric: GrowthMetric<number>) => {
  if (metric.state === 'AVAILABLE' && isMetricValuePresent(metric.value)) {
    return `${metric.value}%`;
  }

  if (metric.state === 'EMPTY') {
    return 'No attendance data';
  }

  if (metric.state === 'NOT_SYNCED') {
    return 'Not synced';
  }

  return 'Unavailable';
};

const formatStatusValue = (metric: GrowthMetric<string>) => {
  if (metric.state === 'AVAILABLE' && isMetricValuePresent(metric.value)) {
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

export default function StudentGrowthHub() {
  const { user, backendUser, backendToken, loading } = useAuth();
  const router = useRouter();
  const [growthData, setGrowthData] = useState<GrowthResponse | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!loading && (!user || !backendUser)) {
      router.push('/login');
    } else if (!loading && backendUser && backendUser.role !== 'STUDENT' && backendUser.role !== 'FACULTY') {
      router.push('/');
    }
  }, [user, backendUser, loading, router]);

  useEffect(() => {
    if (loading || !user || !backendUser || backendUser.role !== 'STUDENT') {
      return;
    }

    if (!backendToken) {
      setGrowthData(null);
      setError('Your session is no longer authenticated. Please sign in again to view your growth summary.');
      setIsLoadingData(false);
      return;
    }

    let isActive = true;

    const loadGrowthData = async () => {
      setIsLoadingData(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/growth/me`, {
          headers: {
            Authorization: `Bearer ${backendToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('growth-request-failed');
        }

        const payload = await response.json();
        if (!payload?.success || !payload?.data?.metrics) {
          throw new Error('growth-response-invalid');
        }

        if (isActive) {
          setGrowthData(payload.data as GrowthResponse);
        }
      } catch {
        if (isActive) {
          setGrowthData(null);
          setError('We could not load your growth summary right now. Please try again.');
        }
      } finally {
        if (isActive) {
          setIsLoadingData(false);
        }
      }
    };

    loadGrowthData();

    return () => {
      isActive = false;
    };
  }, [backendToken, backendUser, loading, retryCount, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  if (!user || !backendUser || backendUser.role !== 'STUDENT') {
    return null;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Growth Hub</h1>
        <p className="text-slate-400">A secure summary of your verified marks, attendance, and connected learning activity.</p>
      </div>

      {isLoadingData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 animate-pulse">
              <div className="h-4 w-28 bg-slate-700 rounded mb-4" />
              <div className="h-8 w-20 bg-slate-700 rounded mb-2" />
              <div className="h-4 w-40 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : null}

      {!isLoadingData && error ? (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-2">Growth summary unavailable</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => setRetryCount((value) => value + 1)}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!isLoadingData && growthData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-emerald-400">Marks overview</h2>
                <p className="text-sm text-slate-400">Verified marks recorded for your current organization.</p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-300">
                {describeState(growthData.metrics.marksSummary)}
              </span>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm text-slate-400">Recorded mark entries</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {growthData.metrics.marksSummary.state === 'AVAILABLE' && isMetricValuePresent(growthData.metrics.marksSummary.value)
                    ? growthData.metrics.marksSummary.value
                    : 'No data'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Average marks</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {formatMetricValue(growthData.metrics.averageMarks, '')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-emerald-400">Attendance</h2>
                <p className="text-sm text-slate-400">Current Ezone attendance status if available.</p>
              </div>
              <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
                {describeState(growthData.metrics.attendance)}
              </span>
            </div>
            <p className="mt-6 text-3xl font-semibold text-white">{formatAttendanceValue(growthData.metrics.attendance)}</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-emerald-400">Academic profile</h2>
                <p className="text-sm text-slate-400">Latest profile status from the connected academic source.</p>
              </div>
              <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
                {describeState(growthData.metrics.academicProfileStatus)}
              </span>
            </div>
            <p className="mt-6 text-lg font-semibold text-white">{formatStatusValue(growthData.metrics.academicProfileStatus)}</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-emerald-400">GitHub activity</h2>
                <p className="text-sm text-slate-400">Repository and project counts from your connected GitHub profile.</p>
              </div>
              <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
                {describeState(growthData.metrics.githubRepositoryCount)}
              </span>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm text-slate-400">Repositories</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {growthData.metrics.githubRepositoryCount.state === 'AVAILABLE' && isMetricValuePresent(growthData.metrics.githubRepositoryCount.value)
                    ? growthData.metrics.githubRepositoryCount.value
                    : 'Not available'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Completed projects</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {growthData.metrics.completedProjects.state === 'AVAILABLE' && isMetricValuePresent(growthData.metrics.completedProjects.value)
                    ? growthData.metrics.completedProjects.value
                    : 'Not available'}
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-emerald-400">Subject performance</h2>
                <p className="text-sm text-slate-400">Real subject averages from your verified marks data.</p>
              </div>
              <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
                {describeState(growthData.metrics.subjectWisePerformance)}
              </span>
            </div>

            {growthData.metrics.subjectWisePerformance.state === 'AVAILABLE' && growthData.metrics.subjectWisePerformance.value?.length ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {growthData.metrics.subjectWisePerformance.value.map((item) => (
                  <div key={item.subjectId} className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-white">{item.subjectId}</h3>
                      <span className="text-sm text-emerald-300">{item.averageMarks.toFixed(2)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{item.count} recorded mark{item.count === 1 ? '' : 's'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-400">No subject-wise marks are available yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}