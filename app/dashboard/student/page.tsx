'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function StudentDashboardOverview() {
  const { user, backendUser, loading } = useAuth();
  const router = useRouter();
  
  // Focused metrics for the minimal intelligence dashboard
  const [metrics, setMetrics] = useState({
    growthRate: '85%',
    gpa: '3.8',
    attendance: '92%',
    currentSemester: '6th',
    creditsEarned: 112,
  });

  useEffect(() => {
    if (backendUser && backendUser.role === 'STUDENT') {
      const fetchMetrics = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/dashboard/student`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.data) {
              setMetrics(prev => ({ ...prev, ...data.data }));
            }
          }
        } catch (err) {
          console.error('Failed to fetch metrics', err);
        }
      };
      fetchMetrics();
    }
  }, [backendUser]);

  useEffect(() => {
    if (!loading && (!user || !backendUser)) {
      router.push('/login');
    } else if (!loading && backendUser && backendUser.role !== 'STUDENT' && backendUser.role !== 'FACULTY') {
      router.push('/');
    }
  }, [user, backendUser, loading, router]);

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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Student View</h1>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Your academic performance at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
            <span className="text-emerald-400 text-sm font-semibold">Active Session: {metrics.currentSemester} Semester</span>
          </div>
        </div>
      </div>

      {/* Primary Hero Section - Academic Snapshot */}
      <div className="w-full bg-slate-800/40 backdrop-blur-md rounded-2xl p-8 border border-slate-700/50 shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            Academic Snapshot
          </h2>
          <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">Real-time Intelligence</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Attendance Card */}
          <div className="space-y-3 p-4 bg-slate-900/30 rounded-2xl border border-slate-700/30 transition-all hover:border-emerald-500/30">
            <div className="text-3xl font-black text-white">{metrics.attendance}</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Attendance</div>
            <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000" 
                style={{ width: metrics.attendance }}
              ></div>
            </div>
          </div>

          {/* GPA Card */}
          <div className="space-y-3 p-4 bg-slate-900/30 rounded-2xl border border-slate-700/30 transition-all hover:border-emerald-500/30">
            <div className="text-3xl font-black text-white">{metrics.gpa}</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Current CGPA</div>
            <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/></svg>
              +0.2 Performance gain
            </div>
          </div>

          {/* Credits Card */}
          <div className="space-y-3 p-4 bg-slate-900/30 rounded-2xl border border-slate-700/30 transition-all hover:border-emerald-500/30">
            <div className="text-3xl font-black text-white">{metrics.creditsEarned}</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Credits Earned</div>
            <div className="text-slate-500 text-[11px] font-medium italic">Target: 160 Total Credits</div>
          </div>

          {/* Growth Velocity Card */}
          <div className="space-y-3 p-4 bg-slate-900/30 rounded-2xl border border-slate-700/30 transition-all hover:border-emerald-500/30">
            <div className="text-3xl font-black text-white">{metrics.growthRate}</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Growth Velocity</div>
            <div className="text-emerald-500 text-[11px] font-bold uppercase tracking-tighter">Elite Performance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
