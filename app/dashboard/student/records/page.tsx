'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function StudentAcademicRecords() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Academic Records</h1>
        <p className="text-slate-400">View and manage your academic transcripts and records</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Summary */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Academic Summary</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Overall GPA</h3>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-emerald-400">8.5</span>
                <span className="text-slate-400">/ 10.0</span>
              </div>
              <div className="mt-2 text-sm text-slate-400">Excellent Standing</div>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Credits Completed</h3>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-emerald-400">98</span>
                <span className="text-slate-400">/ 150</span>
              </div>
              <div className="mt-2 text-sm text-slate-400">52 credits remaining</div>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Class Standing</h3>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-emerald-400">Junior</span>
              </div>
              <div className="mt-2 text-sm text-slate-400">Second Year - Second Semester</div>
            </div>
          </div>
        </div>

        {/* Current Semester */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Current Semester (Fall 2024)</h2>
          <div className="space-y-3">
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-medium text-white">Advanced Data Structures</h3>
              <div className="flex justify-between mt-1">
                <span className="text-slate-400">CS301</span>
                <span className="text-emerald-400">A-</span>
              </div>
            </div>
            
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-medium text-white">Database Systems</h3>
              <div className="flex justify-between mt-1">
                <span className="text-slate-400">CS302</span>
                <span className="text-emerald-400">B+</span>
              </div>
            </div>
            
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-medium text-white">Software Engineering</h3>
              <div className="flex justify-between mt-1">
                <span className="text-slate-400">CS303</span>
                <span className="text-emerald-400">A</span>
              </div>
            </div>
            
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-medium text-white">Operating Systems</h3>
              <div className="flex justify-between mt-1">
                <span className="text-slate-400">CS304</span>
                <span className="text-emerald-400">B</span>
              </div>
            </div>
            
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-medium text-white">Mathematics for AI</h3>
              <div className="flex justify-between mt-1">
                <span className="text-slate-400">MA301</span>
                <span className="text-emerald-400">A+</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Transcript</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Credits</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Semester</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Introduction to Programming</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS101</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">4</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">A+</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Fall 2023</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Completed</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Calculus I</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">MA101</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">4</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">A</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Fall 2023</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Completed</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Physics for Engineers</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">PH101</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">3</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">B+</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Fall 2023</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Completed</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Data Structures</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS201</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">4</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">A-</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Spring 2024</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Completed</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Object Oriented Programming</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS202</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">4</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">A</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Spring 2024</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Completed</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Download Options */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Download Documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-lg transition flex flex-col items-center justify-center">
              <div className="text-2xl mb-2">📄</div>
              <span>Official Transcript</span>
            </button>
            <button className="bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-lg transition flex flex-col items-center justify-center">
              <div className="text-2xl mb-2">📋</div>
              <span>Certificate of Enrollment</span>
            </button>
            <button className="bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-lg transition flex flex-col items-center justify-center">
              <div className="text-2xl mb-2">🎓</div>
              <span>Degree Audit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}