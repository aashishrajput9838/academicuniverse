'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { MarksOverviewCard } from '@/components/MarksOverviewCard';
import { AttendanceCard } from '@/components/AttendanceCard';
import { AcademicProfileCard } from '@/components/AcademicProfileCard';
import { GithubActivityCard } from '@/components/GithubActivityCard';
import { SubjectPerformanceCard } from '@/components/SubjectPerformanceCard';
import { GrowthUploadPanel } from '@/components/GrowthUploadPanel';
import { useGrowthStore } from './store/growthStore';
import { useGrowthUploadStore } from './store/growthUploadStore';

export default function StudentGrowthHub() {
  const { user, backendUser, backendToken, loading } = useAuth();
  const router = useRouter();
  const { growthData, loading: isLoadingData, error, lastFetchedAt, refresh, reset } = useGrowthStore();
  const stopAllPolling = useGrowthUploadStore((s) => s.stopAllPolling);

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
      // No token – clear store and show auth error
      reset('Your session is no longer authenticated. Please sign in again to view your growth summary.');
      return;
    }

    refresh(backendToken);

    // refresh is handled by GrowthStore; cleanup handled internally
  }, [backendToken, backendUser, loading, refresh, reset, user]);

  // Cleanup upload polling on unmount
  useEffect(() => {
    return () => {
      stopAllPolling();
    };
  }, [stopAllPolling]);

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

      {/* Upload Academic Documents — primary CTA section */}
      {backendToken && (
        <div className="mb-8">
          <GrowthUploadPanel backendToken={backendToken} />
        </div>
      )}

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
            onClick={() => {
              if (backendToken) {
                refresh(backendToken);
              }
            }}
            disabled={!backendToken}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!isLoadingData && growthData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MarksOverviewCard
            marksSummary={growthData.metrics.marksSummary}
            averageMarks={growthData.metrics.averageMarks}
          />

          <AttendanceCard attendance={growthData.metrics.attendance} />

          <AcademicProfileCard academicProfileStatus={growthData.metrics.academicProfileStatus} />

          <GithubActivityCard
            githubRepositoryCount={growthData.metrics.githubRepositoryCount}
            completedProjects={growthData.metrics.completedProjects}
          />

          <SubjectPerformanceCard subjectWisePerformance={growthData.metrics.subjectWisePerformance} />
        </div>
      ) : null}
    </div>
  );
}
