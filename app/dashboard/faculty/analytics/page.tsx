'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function FacultyAnalyticsReports() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Analytics & Reports</h1>
        <p className="text-slate-400">Access comprehensive data and analytical reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Students */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400">186</div>
          <div className="text-slate-400 mt-2">Total Students Supervised</div>
          <div className="text-emerald-400 text-sm mt-1">↑ 12% from last semester</div>
        </div>
        
        {/* Avg Course Satisfaction */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400">94%</div>
          <div className="text-slate-400 mt-2">Avg Course Satisfaction</div>
          <div className="text-emerald-400 text-sm mt-1">↑ 5% from last semester</div>
        </div>
        
        {/* Avg Student Grade */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400">82.5%</div>
          <div className="text-slate-400 mt-2">Avg Student Grade</div>
          <div className="text-emerald-400 text-sm mt-1">↑ 2.3% from last semester</div>
        </div>
        
        {/* Research Projects */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400">12</div>
          <div className="text-slate-400 mt-2">Research Projects</div>
          <div className="text-emerald-400 text-sm mt-1">↑ 3 from last year</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Course Performance */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Course Performance</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Advanced Data Structures</span>
                <span className="text-emerald-400 font-semibold">87%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '87%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Database Systems</span>
                <span className="text-emerald-400 font-semibold">84%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '84%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Software Engineering</span>
                <span className="text-emerald-400 font-semibold">92%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Operating Systems</span>
                <span className="text-emerald-400 font-semibold">79%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '79%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Student Performance Trends */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Student Performance Trends</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Improvement Areas</h3>
              <ul className="space-y-2">
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Problem-Solving Skills</span>
                  <span className="text-emerald-400">+15%</span>
                </li>
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Collaboration</span>
                  <span className="text-emerald-400">+12%</span>
                </li>
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Time Management</span>
                  <span className="text-emerald-400">+8%</span>
                </li>
              </ul>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Focus Areas</h3>
              <ul className="space-y-2">
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Academic Integrity</span>
                  <span className="text-yellow-400">-5%</span>
                </li>
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Attendance</span>
                  <span className="text-yellow-400">-3%</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Reports & Downloads */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Reports & Downloads</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Course Performance Report</h3>
              <p className="text-slate-400 text-sm mb-3">Detailed analysis of all courses</p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Download
              </button>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Student Progress Report</h3>
              <p className="text-slate-400 text-sm mb-3">Individual and group progress data</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Download
              </button>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Department Analytics</h3>
              <p className="text-slate-400 text-sm mb-3">Comparison with department averages</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Download
              </button>
            </div>
          </div>
        </div>

        {/* Academic Calendar Insights */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Academic Calendar Insights</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Metric</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Fall 2023</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Spring 2024</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Fall 2024</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Avg. Course Grade</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">79.2%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">80.5%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">82.5%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">↑ +3.3%</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Avg. Attendance</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">84.7%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">86.1%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-400">83.2%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-400">↓ -2.9%</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Course Satisfaction</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">88.4%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">90.2%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">94.0%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">↑ +3.8%</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Assignment Completion</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">87.3%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">89.6%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">91.8%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">↑ +4.5%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}