'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import GitHubProjects from '@/components/GitHubProjects';

export default function StudentDashboardOverview() {
  const { user, backendUser, loading } = useAuth();
  const router = useRouter();
  
  // Enhanced metrics for the intelligence dashboard
  const [metrics, setMetrics] = useState({
    growthRate: '85%',
    gpa: '3.8',
    skillsAcquired: 12,
    projectsCompleted: 8,
    attendance: '92%',
    currentSemester: '6th',
    creditsEarned: 112,
    placementReadiness: '78%',
    resumeStatus: '90%'
  });

  const [upcomingEvents, setUpcomingEvents] = useState([
    { id: 1, type: 'Exam', title: 'Mid-term: Distributed Systems', date: 'Oct 15, 2024', priority: 'high' },
    { id: 2, type: 'Hackathon', title: 'Smart India Hackathon', date: 'Oct 20-22, 2024', priority: 'medium' },
    { id: 3, type: 'Workshop', title: 'AI Ethics & Governance', date: 'Oct 25, 2024', priority: 'low' },
  ]);

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Attendance Alert', message: 'Your attendance in OS is below 75%', time: '2h ago', type: 'warning' },
    { id: 2, title: 'New Grade', message: 'Cloud Computing assignment graded', time: '5h ago', type: 'info' },
    { id: 3, title: 'Placement Drive', message: 'Google hiring for 2025 graduates', time: '1d ago', type: 'success' },
  ]);

  const [aiInsights, setAiInsights] = useState([
    "Your coding activity peaked on Wednesday. Keep it up!",
    "Focus on 'Network Security' to improve your overall CGPA.",
    "You are in the top 5% for 'Problem Solving' skills this month."
  ]);

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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Student Intelligence Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Real-time academic insights and performance tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
            <span className="text-emerald-400 text-sm font-semibold">Active Session: {metrics.currentSemester} Semester</span>
          </div>
        </div>
      </div>

      {/* Primary Intelligence Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Academic Snapshot */}
        <div className="lg:col-span-2 bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              Academic Snapshot
            </h2>
            <span className="text-xs text-slate-500 font-medium">Last updated: Just now</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="text-2xl font-black text-white">{metrics.attendance}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Attendance</div>
              <div className="w-full bg-slate-700/50 h-1 rounded-full mt-2">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: metrics.attendance }}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-white">{metrics.gpa}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Current CGPA</div>
              <div className="flex items-center gap-1 mt-2 text-emerald-400 text-[10px] font-bold">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/></svg>
                +0.2 from last sem
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-white">{metrics.creditsEarned}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Credits Earned</div>
              <div className="text-slate-500 text-[10px] mt-2 font-medium">Target: 160 Credits</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-white">{metrics.growthRate}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Growth Velocity</div>
              <div className="text-emerald-500 text-[10px] mt-2 font-medium">Excellent Performance</div>
            </div>
          </div>
        </div>

        {/* Placement Readiness */}
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            Placement Readiness
          </h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400 font-medium">Overall Score</span>
                <span className="text-emerald-400 font-bold">{metrics.placementReadiness}</span>
              </div>
              <div className="w-full bg-slate-700/50 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" style={{ width: metrics.placementReadiness }}></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Resume Status</div>
                  <div className="text-[10px] text-slate-500">{metrics.resumeStatus} Completed</div>
                </div>
              </div>
              <button className="text-[10px] font-bold text-emerald-400 hover:underline">Update</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events & Deadlines */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Upcoming Events & Deadlines
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {upcomingEvents.map(event => (
                <div key={event.id} className="p-4 bg-slate-900/40 rounded-xl border border-slate-700/50 group hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      event.priority === 'high' ? 'bg-red-500/10 text-red-400' : 
                      event.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {event.type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">{event.date}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors leading-snug">
                    {event.title}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GitHub & Projects Integration */}
          <GitHubProjects />
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              Recent Notifications
            </h2>
            <div className="space-y-4">
              {notifications.map(note => (
                <div key={note.id} className="flex gap-3 p-3 bg-slate-900/20 rounded-xl hover:bg-slate-900/40 transition-colors">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                    note.type === 'warning' ? 'bg-red-500' : note.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}></div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-200">{note.title}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{note.message}</div>
                    <div className="text-[9px] text-slate-600 font-medium">{note.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Personalized Insights */}
          <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              AI Smart Insights
            </h2>
            <div className="space-y-4">
              {aiInsights.map((insight, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="text-emerald-400 text-xs font-bold">•</div>
                  <div className="text-[11px] text-slate-300 font-medium leading-relaxed italic">
                    "{insight}"
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-emerald-500/20">
              <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Powered by Gemini 2.5
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info / Classroom Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </div>
            <div>
              <div className="text-sm font-bold text-white">Free Classroom Alerts</div>
              <div className="text-xs text-slate-500">Block B - 302 available for self-study</div>
            </div>
          </div>
          <button className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-xs font-bold text-white transition-colors border border-slate-600">
            View Map
          </button>
        </div>
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </div>
            <div>
              <div className="text-sm font-bold text-white">Synced Ezone Data</div>
              <div className="text-xs text-slate-500">Latest internal marks synced 2h ago</div>
            </div>
          </div>
          <button className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 transition-colors border border-emerald-500/30">
            Sync Now
          </button>
        </div>
      </div>
    </div>
  );
}
