'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export default function FacultyResearchWing() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Research Wing</h1>
        <p className="text-slate-400">Collaborate on research and publication projects</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Collaboration Tools */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Collaboration Tools</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Global Connections</h3>
              <p className="text-slate-400 text-sm mb-3">Connect with researchers worldwide</p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Find Collaborators
              </button>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Project Management</h3>
              <p className="text-slate-400 text-sm mb-3">Track and manage research collaborations</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Manage Projects
              </button>
            </div>
          </div>
        </div>

        {/* Publication Support */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Publication Support</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">AI-Assisted Writing</h3>
              <p className="text-slate-400 text-sm mb-3">Draft and refine research papers with AI</p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Start Writing
              </button>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Format Assistant</h3>
              <p className="text-slate-400 text-sm mb-3">Ensure compliance with journal requirements</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Check Format
              </button>
            </div>
          </div>
        </div>

        {/* Ongoing Projects */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Ongoing Research Projects</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Collaborators</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Deadline</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">AI-Driven Educational Assessment</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">4 collaborators</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Active</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-32 bg-slate-700 rounded-full h-2 mr-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                      <span className="text-sm text-slate-400">75%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Dec 15, 2024</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button className="text-emerald-400 hover:text-emerald-300 mr-3">View</button>
                    <button className="text-slate-400 hover:text-slate-300">Edit</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Quantum Computing Education</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">2 collaborators</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-500/20 text-yellow-400">In Review</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-32 bg-slate-700 rounded-full h-2 mr-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                      <span className="text-sm text-slate-400">45%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Nov 30, 2024</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button className="text-emerald-400 hover:text-emerald-300 mr-3">View</button>
                    <button className="text-slate-400 hover:text-slate-300">Edit</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Sustainable Energy Solutions</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">6 collaborators</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/20 text-blue-400">Planning</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-32 bg-slate-700 rounded-full h-2 mr-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                      </div>
                      <span className="text-sm text-slate-400">20%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Jan 20, 2025</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button className="text-emerald-400 hover:text-emerald-300 mr-3">View</button>
                    <button className="text-slate-400 hover:text-slate-300">Edit</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Research Resources */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Research Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Grant Opportunities</h3>
              <p className="text-slate-400 text-sm mb-3">Find funding for your research projects</p>
              <button className="text-emerald-400 hover:text-emerald-300 text-sm">Browse Grants</button>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Lab Resources</h3>
              <p className="text-slate-400 text-sm mb-3">Access to advanced laboratory equipment</p>
              <button className="text-emerald-400 hover:text-emerald-300 text-sm">Reserve Equipment</button>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Research Databases</h3>
              <p className="text-slate-400 text-sm mb-3">Access premium academic databases</p>
              <button className="text-emerald-400 hover:text-emerald-300 text-sm">Access Databases</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}