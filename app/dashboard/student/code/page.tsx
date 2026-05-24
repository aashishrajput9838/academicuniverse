'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function StudentCodeArena() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Code Arena</h1>
        <p className="text-slate-400">Compete and enhance your coding skills</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coding Challenges */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Coding Challenges</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Algorithm Problems</h3>
              <p className="text-slate-400 text-sm mb-3">Practice algorithms and data structures</p>
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 text-sm">Level: Intermediate</span>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">
                  Start Challenge
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">System Design</h3>
              <p className="text-slate-400 text-sm mb-3">Design scalable systems and architectures</p>
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 text-sm">Level: Advanced</span>
                <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                  Start Challenge
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Real-World Projects</h3>
              <p className="text-slate-400 text-sm mb-3">Apply skills to practical scenarios</p>
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 text-sm">Level: Expert</span>
                <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                  Start Challenge
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Performance Stats</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Challenges Completed</span>
                <span className="text-emerald-400 font-semibold">42</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Success Rate</span>
                <span className="text-emerald-400 font-semibold">85%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Ranking</span>
                <span className="text-emerald-400 font-semibold">#24</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Languages Used</h3>
              <div className="flex flex-wrap gap-2">
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded">JavaScript</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded">Python</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded">Java</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded">C++</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded">React</span>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Leaderboard</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Points</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Challenges</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-yellow-400">#1</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Ananya Sharma</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">1,240</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">68</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">92%</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-300">#2</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Raj Patel</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">1,180</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">65</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">89%</td>
                </tr>
                <tr className="bg-emerald-500/10">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-emerald-400">#24</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">You</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">780</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">42</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">85%</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-400">#25</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Priya Singh</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">750</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">40</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">82%</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-400">#26</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Arjun Kumar</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">720</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">38</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">78%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-600">
              <div>
                <h3 className="font-medium text-white">Completed "Dynamic Programming" challenge</h3>
                <p className="text-slate-400 text-sm">2 hours ago</p>
              </div>
              <span className="text-emerald-400 text-sm">+25 pts</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-600">
              <div>
                <h3 className="font-medium text-white">Joined "Weekly Algorithm Contest"</h3>
                <p className="text-slate-400 text-sm">1 day ago</p>
              </div>
              <span className="text-emerald-400 text-sm">+10 pts</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-600">
              <div>
                <h3 className="font-medium text-white">Achieved "Silver Rank" milestone</h3>
                <p className="text-slate-400 text-sm">3 days ago</p>
              </div>
              <span className="text-emerald-400 text-sm">+50 pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}