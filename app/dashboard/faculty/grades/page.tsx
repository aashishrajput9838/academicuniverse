'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function FacultyGradesManagement() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Grades & Assessments</h1>
        <p className="text-slate-400">Add, edit, and review student grades</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grade Entry */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Grade Entry</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Assignment Grades</h3>
              <p className="text-slate-400 text-sm mb-3">Enter grades for assignments and homework</p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Enter Grades
              </button>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Exam Scores</h3>
              <p className="text-slate-400 text-sm mb-3">Input midterm and final exam scores</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Enter Exam Scores
              </button>
            </div>
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Grade Distribution</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Visual Analysis</h3>
              <p className="text-slate-400 text-sm mb-3">View grade distribution charts and statistics</p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">
                View Charts
              </button>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Export Data</h3>
              <p className="text-slate-400 text-sm mb-3">Download grade reports and analytics</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Gradebook Table */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Gradebook</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Assignment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Aarav Sharma</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Midterm Exam</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS301</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">87/100</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Oct 15, 2024</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Graded</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Diya Patel</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Project 1</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS301</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">92/100</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Oct 10, 2024</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Graded</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Rohan Gupta</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Quiz 3</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS301</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-400">68/100</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Oct 8, 2024</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Graded</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Priya Nair</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Homework 4</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS301</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">95/100</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Oct 5, 2024</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Graded</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Grade Statistics */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Grade Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-1">Class Average</h3>
              <div className="text-2xl font-bold text-emerald-400">82.5%</div>
              <div className="text-xs text-slate-400">vs Previous: 80.2%</div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-1">Highest Score</h3>
              <div className="text-2xl font-bold text-emerald-400">98%</div>
              <div className="text-xs text-slate-400">by Priya Nair</div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-1">Lowest Score</h3>
              <div className="text-2xl font-bold text-emerald-400">56%</div>
              <div className="text-xs text-slate-400">needs attention</div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-1">Standard Deviation</h3>
              <div className="text-2xl font-bold text-emerald-400">±12.3</div>
              <div className="text-xs text-slate-400">moderate spread</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}