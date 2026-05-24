'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function FacultyStudentsManagement() {
  const { user, backendUser, loading } = useAuth();
  const router = useRouter();

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
        <h1 className="text-3xl font-bold text-white mb-2">Student Management</h1>
        <p className="text-slate-400">Monitor and evaluate student progress with our analytics tools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Analytics */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Performance Analytics</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Individual Tracking</h3>
              <p className="text-slate-400 text-sm mb-3">Monitor individual student progress and performance</p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">
                View Students
              </button>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Group Analysis</h3>
              <p className="text-slate-400 text-sm mb-3">Analyze performance trends across classes</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Analyze Groups
              </button>
            </div>
          </div>
        </div>

        {/* Grade Management */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Grade Management</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Add/Edit Grades</h3>
              <p className="text-slate-400 text-sm mb-3">Update student grades for assignments and exams</p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Manage Grades
              </button>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Grade Distribution</h3>
              <p className="text-slate-400 text-sm mb-3">View grade distributions and statistics</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                View Distribution
              </button>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Student Roster</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Avg Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Attendance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Aarav Sharma</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">2023329421</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS301</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">87%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">95%</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Good Standing</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Diya Patel</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">2023329422</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS301</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">92%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">98%</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Good Standing</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Rohan Gupta</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">2023329423</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS301</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-400">68%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-400">72%</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-500/20 text-yellow-400">Needs Attention</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Priya Nair</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">2023329424</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS301</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">95%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">99%</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Excellent</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Student Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
              <h3 className="font-semibold text-red-400 mb-2">Low Attendance</h3>
              <p className="text-slate-300 text-sm">5 students with attendance below 75%</p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <h3 className="font-semibold text-yellow-400 mb-2">Academic Risk</h3>
              <p className="text-slate-300 text-sm">3 students with grades below 70%</p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <h3 className="font-semibold text-green-400 mb-2">High Performers</h3>
              <p className="text-slate-300 text-sm">12 students with grades above 90%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}