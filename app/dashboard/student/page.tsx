'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export default function StudentDashboardOverview() {
  const { user, backendUser, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && (!user || !backendUser)) {
      router.push('/login');
    } else if (!loading && backendUser && backendUser.role !== 'STUDENT' && backendUser.role !== 'FACULTY') {
      // For unauthorized role, redirect to home
      router.push('/');
    }
  }, [user, backendUser, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  // Don't render content until user is authenticated and is a student
  if (!user || !backendUser || backendUser.role !== 'STUDENT') {
    return null;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Student Dashboard Overview</h1>
        <p className="text-slate-400">Welcome back! Here's what's happening with your academic journey.</p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400">85%</div>
          <div className="text-slate-400 mt-2">Growth Rate</div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400">A+</div>
          <div className="text-slate-400 mt-2">Current GPA</div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400">42</div>
          <div className="text-slate-400 mt-2">Skills Acquired</div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400">27</div>
          <div className="text-slate-400 mt-2">Projects Completed</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Growth Hub */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Growth Hub</h2>
            <p className="text-slate-400 mb-4">
              Track your intellectual and emotional growth with our AI-powered analytics
            </p>
            <div className="space-y-3">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                <h3 className="font-semibold text-emerald-400 mb-1">IQ/EQ Trends</h3>
                <p className="text-slate-400 text-sm">Monitor your cognitive and emotional intelligence progress</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                <h3 className="font-semibold text-emerald-400 mb-1">Growth Analysis</h3>
                <p className="text-slate-400 text-sm">Identify areas for improvement and track degradation</p>
              </div>
            </div>
          </div>

          {/* Career & Verified Profile */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Career & Verified Profile</h2>
            <p className="text-slate-400 mb-4">
              Build your professional presence and showcase your achievements
            </p>
            <div className="space-y-3">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                <h3 className="font-semibold text-emerald-400 mb-1">Centralized Presence</h3>
                <p className="text-slate-400 text-sm">Unified profile across platforms</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                <h3 className="font-semibold text-emerald-400 mb-1">Certifications</h3>
                <p className="text-slate-400 text-sm">Verify and showcase your credentials</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Chatbot */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">AI Chatbot</h2>
            <p className="text-slate-400 mb-4">
              Get 24/7 emotional support and academic guidance
            </p>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <p className="text-emerald-400 text-sm">Emotional Support Available</p>
            </div>
          </div>

          {/* Research Wing */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Research Wing</h2>
            <p className="text-slate-400 mb-4">
              Access research tools and publication support
            </p>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-emerald-400 mb-1">Publication Support</h3>
              <p className="text-slate-400 text-sm">AI-assisted research paper creation</p>
            </div>
          </div>

          {/* Code Arena */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Code Arena</h2>
            <p className="text-slate-400 mb-4">
              Compete and enhance your coding skills
            </p>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-emerald-400 mb-1">Coding Challenges</h3>
              <p className="text-slate-400 text-sm">Practice and compete with peers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}