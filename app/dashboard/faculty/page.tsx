'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function FacultyDashboardOverview() {
  const { user, backendUser, loading } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState({
    coursesManaged: 0,
    studentsSupervised: 0,
    researchProjects: 0,
    courseSatisfaction: '...'
  });

  useEffect(() => {
    if (backendUser && backendUser.role === 'FACULTY') {
      const fetchMetrics = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/dashboard/faculty`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.data) {
              setMetrics(data.data);
            }
          }
        } catch (err) {
          console.error('Failed to fetch metrics', err);
        }
      };
      fetchMetrics();
    }
  }, [backendUser]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && (!user || !backendUser)) {
      router.push('/login');
    } else if (!loading && backendUser && backendUser.role !== 'FACULTY' && backendUser.role !== 'STUDENT') {
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

  // Don't render content until user is authenticated and is a faculty member
  if (!user || !backendUser || backendUser.role !== 'FACULTY') {
    return null;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Faculty Dashboard Overview</h1>
        <p className="text-slate-400">Manage your courses, monitor student progress, and access academic tools</p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400">{metrics.coursesManaged}</div>
          <div className="text-slate-400 mt-2">Courses Managed</div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400">{metrics.studentsSupervised}</div>
          <div className="text-slate-400 mt-2">Students Supervised</div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400">{metrics.researchProjects}</div>
          <div className="text-slate-400 mt-2">Research Projects</div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400">{metrics.courseSatisfaction}</div>
          <div className="text-slate-400 mt-2">Course Satisfaction</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Student Management */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Student Management</h2>
            <p className="text-slate-400 mb-4">
              Monitor and evaluate student progress with our analytics tools
            </p>
            <div className="space-y-3">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                <h3 className="font-semibold text-emerald-400 mb-1">Performance Analytics</h3>
                <p className="text-slate-400 text-sm">Track individual and group progress</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                <h3 className="font-semibold text-emerald-400 mb-1">Grade Management</h3>
                <p className="text-slate-400 text-sm">Add, edit, and review student grades</p>
              </div>
            </div>
          </div>

          {/* Course & Curriculum */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Course & Curriculum</h2>
            <p className="text-slate-400 mb-4">
              Manage course materials and curriculum content
            </p>
            <div className="space-y-3">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                <h3 className="font-semibold text-emerald-400 mb-1">Course Materials</h3>
                <p className="text-slate-400 text-sm">Upload and organize learning resources</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                <h3 className="font-semibold text-emerald-400 mb-1">Curriculum Design</h3>
                <p className="text-slate-400 text-sm">Plan and update course structures</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Assistant */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">AI Assistant</h2>
            <p className="text-slate-400 mb-4">
              Get administrative support and insights
            </p>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <p className="text-emerald-400 text-sm">Administrative Support Available</p>
            </div>
          </div>

          {/* Research Wing */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Research Wing</h2>
            <p className="text-slate-400 mb-4">
              Collaborate on research and publication projects
            </p>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-emerald-400 mb-1">Collaboration Tools</h3>
              <p className="text-slate-400 text-sm">Connect with researchers globally</p>
            </div>
          </div>

          {/* Faculty Resources */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Faculty Resources</h2>
            <p className="text-slate-400 mb-4">
              Access teaching aids and professional development
            </p>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-emerald-400 mb-1">Teaching Tools</h3>
              <p className="text-slate-400 text-sm">Resources for enhanced learning</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}