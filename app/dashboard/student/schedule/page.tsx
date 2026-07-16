'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useModuleRefresh } from '@/hooks/useModuleRefresh';
import { formatDateForDisplay, normalizeDate } from '@/lib/utils/dateNormalizer';

interface ScheduleEvent {
  timeSlot: string;
  courseCode: string;
  courseName: string;
  room: string;
  instructor: string;
  type?: string;
}

interface ScheduleDay {
  date: string;
  events: ScheduleEvent[];
}

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
  const today = normalizeDate(new Date()).iso ?? '';
  const upcomingDays = days.filter(d => d.date >= today);
  const pastDays = days.filter(d => d.date < today);

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

          {upcomingDays.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Upcoming Classes</h2>
              <div className="space-y-4">
                {upcomingDays.map(day => (
                  <div key={day.date} className="rounded-xl border border-slate-700/50 bg-slate-800/20 overflow-hidden">
                    <div className="bg-slate-800/40 px-4 py-2 border-b border-slate-700/50">
                      <p className="text-sm font-semibold text-white">
                        {formatDateForDisplay(day.date)}
                      </p>
                    </div>
                    <div className="divide-y divide-slate-700/30">
                      {day.events.map((event, idx) => (
                        <div key={idx} className="px-4 py-3 flex items-center gap-4">
                          <div className="w-20 text-xs font-mono text-emerald-400 shrink-0">
                            {event.timeSlot}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {event.courseName} <span className="text-slate-500 font-normal">({event.courseCode})</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {event.instructor} · {event.room}
                              {event.type && <span className="ml-2 text-slate-500">· {event.type}</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                      {day.events.length === 0 && (
                        <div className="px-4 py-3 text-xs text-slate-500">No classes scheduled</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastDays.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 opacity-60">Previous Classes</h2>
              <div className="space-y-4">
                {pastDays.map(day => (
                  <div key={day.date} className="rounded-xl border border-slate-700/30 bg-slate-800/10 overflow-hidden opacity-70">
                    <div className="bg-slate-800/20 px-4 py-2 border-b border-slate-700/30">
                      <p className="text-sm font-medium text-slate-400">
                        {formatDateForDisplay(day.date)}
                      </p>
                    </div>
                    <div className="divide-y divide-slate-700/20">
                      {day.events.map((event, idx) => (
                        <div key={idx} className="px-4 py-3 flex items-center gap-4">
                          <div className="w-20 text-xs font-mono text-slate-500 shrink-0">
                            {event.timeSlot}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-300 truncate">
                              {event.courseName} <span className="text-slate-500 font-normal">({event.courseCode})</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {event.instructor} · {event.room}
                            </p>
                          </div>
                        </div>
                      ))}
                      {day.events.length === 0 && (
                        <div className="px-4 py-3 text-xs text-slate-600">No classes scheduled</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
