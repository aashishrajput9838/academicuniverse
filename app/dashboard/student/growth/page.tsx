'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export default function StudentGrowthHub() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Growth Hub</h1>
        <p className="text-slate-400">Track your intellectual and emotional growth with our AI-powered analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* IQ/EQ Trends */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">IQ/EQ Trends</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Cognitive Intelligence</span>
                <span className="text-emerald-400 font-semibold">87%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '87%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Emotional Intelligence</span>
                <span className="text-emerald-400 font-semibold">82%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Social Intelligence</span>
                <span className="text-emerald-400 font-semibold">78%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '78%' }}></div>
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600">
            <p className="text-slate-300 text-sm">Based on your activity, your cognitive intelligence has increased by 5% in the last month. Great job!</p>
          </div>
        </div>

        {/* Growth Analysis */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Growth Analysis</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <h3 className="font-semibold text-green-400">Improvement Areas</h3>
              <ul className="mt-2 space-y-1 text-slate-300 text-sm">
                <li>• Time Management (+12%)</li>
                <li>• Critical Thinking (+8%)</li>
                <li>• Collaboration Skills (+10%)</li>
              </ul>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <h3 className="font-semibold text-yellow-400">Focus Areas</h3>
              <ul className="mt-2 space-y-1 text-slate-300 text-sm">
                <li>• Public Speaking (-5%)</li>
                <li>• Stress Management (-3%)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Growth Chart */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Growth Over Time</h2>
          <div className="h-64 flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-600">
            <p className="text-slate-400">Interactive growth chart visualization would appear here</p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Personalized Recommendations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Join Public Speaking Workshop</h3>
              <p className="text-slate-400 text-sm">Improve your communication skills and boost confidence</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Take Stress Management Course</h3>
              <p className="text-slate-400 text-sm">Learn techniques to manage academic pressure</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Participate in Group Projects</h3>
              <p className="text-slate-400 text-sm">Enhance collaboration and teamwork skills</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}