'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useModuleRefresh } from '@/hooks/useModuleRefresh';
import { formatDateForDisplay, normalizeDate } from '@/lib/utils/dateNormalizer';
import { ScheduleDay, getTodayEvents, getNextEvent } from '@/lib/utils/timetable';
import { WeeklyTimetable } from '@/components/WeeklyTimetable';
import { TodaySchedule } from '@/components/TodaySchedule';
import { NextClassWidget } from '@/components/NextClassWidget';

interface AcademicSchedule {
  _id: string;
  organizationId: string;
  personId: string;
  sourceProcessingId: string;
  rawConfidence: number;
  schedule: ScheduleDay[];
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
}

export default function StudentSchedulePage() {
  const { user, backendUser, backendToken, loading: authLoading } = useAuth();
  const router = useRouter();
  const [schedule, setSchedule] = useState<AcademicSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useModuleRefresh(['academic_schedule'], loadSchedule);

  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    } else if (!authLoading && backendUser && backendUser.role !== 'STUDENT' && backendUser.role !== 'FACULTY') {
      router.push('/');
    }
  }, [user, backendUser, authLoading, router]);

  async function loadSchedule() {
    if (!backendToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5003'}/api/academic-schedule/me`, {
        headers: { Authorization: `Bearer ${backendToken}` },
      });
      if (!res.ok) {
        if (res.status === 404) {
          setSchedule(null);
          return;
        }
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to fetch schedule');
      }
      const data = await res.json();
      setSchedule(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule();
  }, [backendToken]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user || !backendUser || backendUser.role !== 'STUDENT') {
    return null;
  }

  const days = schedule?.schedule ?? [];
  const todayEvents = getTodayEvents(days);
  const nextClass = getNextEvent(days);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Academic Schedule</h1>
        <p className="text-slate-400 mt-1 text-sm">Your weekly timetable and class schedule</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !schedule && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-8 text-center">
          <p className="text-slate-400">No schedule found.</p>
          <p className="text-xs text-slate-500 mt-1">Upload a timetable and get it approved to see your schedule here.</p>
        </div>
      )}

      {!loading && schedule && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
              Confidence: {Math.round((schedule.rawConfidence ?? 0) * 100)}%
            </span>
            <span className="text-xs text-slate-500">
              Approved on {formatDateForDisplay(schedule.approvedAt)}
            </span>
          </div>

          {/* Today's Schedule + Next Class */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TodaySchedule events={todayEvents} />
            <NextClassWidget nextClass={nextClass} />
          </div>

          {/* Weekly Timetable */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Weekly Timetable</h2>
            <WeeklyTimetable schedule={days} />
          </div>
        </div>
      )}
    </div>
  );
}
