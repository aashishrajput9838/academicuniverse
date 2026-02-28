'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export default function FacultyCoursesManagement() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Course Management</h1>
        <p className="text-slate-400">Manage course materials and curriculum content</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Course Materials */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Course Materials</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Upload Resources</h3>
              <p className="text-slate-400 text-sm mb-3">Add documents, presentations, and multimedia</p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Upload Materials
              </button>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Manage Content</h3>
              <p className="text-slate-400 text-sm mb-3">Organize and categorize learning resources</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Organize Content
              </button>
            </div>
          </div>
        </div>

        {/* Curriculum Design */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Curriculum Design</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Plan Structure</h3>
              <p className="text-slate-400 text-sm mb-3">Design course syllabus and learning objectives</p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Create Syllabus
              </button>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Update Curriculum</h3>
              <p className="text-slate-400 text-sm mb-3">Modify course content and structure</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Update Curriculum
              </button>
            </div>
          </div>
        </div>

        {/* Active Courses */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Active Courses</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Students</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Schedule</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Advanced Data Structures</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS301</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">42</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Mon/Wed 10:00-11:30</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Active</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button className="text-emerald-400 hover:text-emerald-300 mr-3">Edit</button>
                    <button className="text-slate-400 hover:text-slate-300">View</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Database Systems</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS302</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">38</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Tue/Thu 14:00-15:30</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Active</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button className="text-emerald-400 hover:text-emerald-300 mr-3">Edit</button>
                    <button className="text-slate-400 hover:text-slate-300">View</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Software Engineering</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">CS303</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">45</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Mon/Wed 13:00-14:30</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Active</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button className="text-emerald-400 hover:text-emerald-300 mr-3">Edit</button>
                    <button className="text-slate-400 hover:text-slate-300">View</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Course Analytics */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Course Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold text-white text-sm">Engagement</h3>
              <p className="text-slate-400 text-xs">78%</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center">
              <div className="text-2xl mb-2">📚</div>
              <h3 className="font-semibold text-white text-sm">Completion</h3>
              <p className="text-slate-400 text-xs">82%</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center">
              <div className="text-2xl mb-2">⭐</div>
              <h3 className="font-semibold text-white text-sm">Satisfaction</h3>
              <p className="text-slate-400 text-xs">4.3/5</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center">
              <div className="text-2xl mb-2">👥</div>
              <h3 className="font-semibold text-white text-sm">Participation</h3>
              <p className="text-slate-400 text-xs">89%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}