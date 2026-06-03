'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface EzoneAcademicProfile {
  studentName: string;
  systemId: string;
  program: string;
  school: string;
  status: string;
  attendancePercentage: number;
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  caMarks: {
    courseName: string;
    assignmentMarks: string;
    assessmentMarks: string;
    total: string;
  }[];
  timetable: {
    subject: string;
    faculty: string;
    room: string;
    time: string;
  }[];
  holidays: {
    name: string;
    date: string;
  }[];
  lastSyncedAt: string;
}

export default function StudentDashboardOverview() {
  const { user, backendUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [ezoneProfile, setEzoneProfile] = useState<EzoneAcademicProfile | null>(null);

  useEffect(() => {
    if (backendUser && backendUser.role === 'STUDENT') {
      const fetchDashboardData = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/ezone/profile`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              setEzoneProfile(data.data);
            }
          }
        } catch (err) {
          console.error('Failed to fetch ezone profile', err);
        } finally {
          setIsInitialLoading(false);
        }
      };
      fetchDashboardData();
    }
  }, [backendUser]);

  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    } else if (!authLoading && backendUser && backendUser.role !== 'STUDENT' && backendUser.role !== 'FACULTY') {
      router.push('/');
    }
  }, [user, backendUser, authLoading, router]);

  const getSemesterOrdinal = (sem: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = sem % 100;
    return sem + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const calculateTotalCredits = (subjects: any[]) => {
    if (!subjects || !Array.isArray(subjects)) return 0;
    return subjects.reduce((acc, sub) => acc + (Number(sub.credits) || 0), 0);
  };

  const calculateGrowthVelocity = (attendance: number, cgpa: number) => {
    // Safety check for undefined values
    const safeAttendance = attendance || 0;
    const safeCgpa = cgpa || 0;
    
    // Derived logic: weighted average of attendance and normalized CGPA
    const normalizedCGPA = (safeCgpa / 10) * 100;
    const velocity = (safeAttendance * 0.4) + (normalizedCGPA * 0.6);
    return Math.round(velocity) + '%';
  };

  if (authLoading || isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50 mx-auto" />
          <p className="text-slate-400 animate-pulse text-sm">Refreshing academic records...</p>
        </div>
      </div>
    );
  }

  if (!user || !backendUser || backendUser.role !== 'STUDENT') {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Student View</h1>
          <p className="text-slate-400 mt-1 text-sm md:text-base">
            {ezoneProfile 
              ? `Real-time academic intelligence for ${ezoneProfile.studentName}.`
              : `Your academic performance at a glance.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/5">
            <span className="text-emerald-400 text-sm font-semibold">
              {ezoneProfile 
                ? `System ID: ${ezoneProfile.systemId}`
                : 'Session: Profile Not Synced'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Hero Section - Academic Snapshot */}
      <div className="w-full bg-slate-800/40 backdrop-blur-md rounded-2xl p-8 border border-slate-700/50 shadow-2xl relative overflow-hidden group">
        {/* Decorative background element */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-700" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            Academic Snapshot
          </h2>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">Real-time Intelligence</span>
            {ezoneProfile && (
              <span className="text-[10px] text-slate-600 font-bold">
                Last synced {formatDistanceToNow(new Date(ezoneProfile.lastSyncedAt))} ago
              </span>
            )}
          </div>
        </div>
        
        {!ezoneProfile ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 relative z-10">
            <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center border border-slate-700">
              <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-white font-bold text-lg">Ezone Not Connected</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Connect your Ezone account to load academic data.
              </p>
            </div>
            <Link 
              href="/dashboard/student/ezone-sync"
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Sync College Profile
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {/* Card 1: Attendance % */}
            <div className="space-y-3 p-5 bg-slate-900/30 rounded-2xl border border-slate-700/30 transition-all hover:border-emerald-500/30 hover:bg-slate-900/50">
              <div className="text-3xl font-black text-white">{ezoneProfile.attendancePercentage}%</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Attendance</div>
              <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    ezoneProfile.attendancePercentage >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-red-500'
                  }`} 
                  style={{ width: `${ezoneProfile.attendancePercentage}%` }}
                ></div>
              </div>
              <div className="text-[10px] font-bold text-slate-600">
                {ezoneProfile.presentClasses} / {ezoneProfile.totalClasses} Classes
              </div>
            </div>

            {/* Card 2: Program */}
            <div className="space-y-3 p-5 bg-slate-900/30 rounded-2xl border border-slate-700/30 transition-all hover:border-emerald-500/30 hover:bg-slate-900/50">
              <div className="text-xl font-black text-white line-clamp-2 min-h-[3.5rem] flex items-center">
                {ezoneProfile.program}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Program</div>
              <div className="text-[10px] font-bold text-slate-600 truncate">{ezoneProfile.school}</div>
            </div>

            {/* Card 3: System ID */}
            <div className="space-y-3 p-5 bg-slate-900/30 rounded-2xl border border-slate-700/30 transition-all hover:border-emerald-500/30 hover:bg-slate-900/50">
              <div className="text-3xl font-black text-white">{ezoneProfile.systemId}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">System ID</div>
              <div className="text-[10px] font-bold text-slate-600">Status: {ezoneProfile.status}</div>
            </div>

            {/* Card 4: Last Sync Time */}
            <div className="space-y-3 p-5 bg-slate-900/30 rounded-2xl border border-slate-700/30 transition-all hover:border-emerald-500/30 hover:bg-slate-900/50">
              <div className="text-2xl font-black text-white">
                {formatDistanceToNow(new Date(ezoneProfile.lastSyncedAt))} ago
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Last Sync Time</div>
              <div className="text-emerald-500 text-[11px] font-bold uppercase tracking-tighter">
                Database Updated
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Other stats - Temporarily showing N/A as requested */}
      {ezoneProfile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Credits Earned</div>
            <div className="text-2xl font-bold text-white">N/A</div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Cumulative GPA</div>
            <div className="text-2xl font-bold text-white">N/A</div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Current Semester</div>
            <div className="text-2xl font-bold text-white">N/A</div>
          </div>
        </div>
      )}

      {/* Detailed Academic Data Sections */}
      {ezoneProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* CA Marks Section */}
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-6 overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Continuous Assessment (CA)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700/50">
                    <th className="pb-3 font-semibold">Course</th>
                    <th className="pb-3 font-semibold text-center">Assign</th>
                    <th className="pb-3 font-semibold text-center">Assess</th>
                    <th className="pb-3 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {ezoneProfile.caMarks?.length > 0 ? ezoneProfile.caMarks.map((mark, i) => (
                    <tr key={i} className="text-slate-300 group hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 font-medium text-white max-w-[150px] truncate">{mark.courseName}</td>
                      <td className="py-3 text-center">{mark.assignmentMarks}</td>
                      <td className="py-3 text-center">{mark.assessmentMarks}</td>
                      <td className="py-3 text-right font-bold text-emerald-400">{mark.total}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-500 italic">No CA marks records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Timetable Section */}
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Daily Schedule
            </h3>
            <div className="space-y-4">
              {ezoneProfile.timetable?.length > 0 ? ezoneProfile.timetable.map((slot, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-700/30 group hover:border-blue-500/30 transition-all">
                  <div className="space-y-1">
                    <div className="text-white font-bold text-sm">{slot.subject}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{slot.faculty}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-400 font-black text-sm">{slot.time}</div>
                    <div className="text-[10px] text-slate-500 font-bold">Room: {slot.room}</div>
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center text-slate-500 italic text-sm">No active timetable for today</div>
              )}
            </div>
          </div>

          {/* Holidays Section */}
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-6 lg:col-span-2">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Upcoming Holidays
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ezoneProfile.holidays?.length > 0 ? ezoneProfile.holidays.map((holiday, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-900/40 rounded-xl border border-slate-700/30 hover:border-amber-500/30 transition-all">
                  <div className="bg-amber-500/10 p-3 rounded-lg text-amber-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{holiday.name}</div>
                    <div className="text-xs text-slate-500">{holiday.date}</div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-8 text-center text-slate-500 italic text-sm">No upcoming holidays scheduled</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Sync Button if profile exists */}
      {ezoneProfile && (
        <div className="flex justify-center">
          <Link 
            href="/dashboard/student/ezone-sync"
            className="px-6 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-xs font-bold text-slate-400 hover:text-emerald-400 transition-all flex items-center gap-2 group"
          >
            <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Resync Academic Records
          </Link>
        </div>
      )}
    </div>
  );
}
