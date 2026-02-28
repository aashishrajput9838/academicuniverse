'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export default function StudentSkillsTracker() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Skills Tracker</h1>
        <p className="text-slate-400">Monitor and develop your technical and soft skills</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technical Skills */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Technical Skills</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Python</span>
                <span className="text-emerald-400 font-semibold">Expert</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '90%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">JavaScript</span>
                <span className="text-emerald-400 font-semibold">Advanced</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">React</span>
                <span className="text-emerald-400 font-semibold">Advanced</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Node.js</span>
                <span className="text-emerald-400 font-semibold">Intermediate</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">SQL</span>
                <span className="text-emerald-400 font-semibold">Intermediate</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Machine Learning</span>
                <span className="text-emerald-400 font-semibold">Beginner</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Soft Skills */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Soft Skills</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Communication</span>
                <span className="text-emerald-400 font-semibold">Advanced</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Leadership</span>
                <span className="text-emerald-400 font-semibold">Intermediate</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Teamwork</span>
                <span className="text-emerald-400 font-semibold">Advanced</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Problem Solving</span>
                <span className="text-emerald-400 font-semibold">Advanced</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '87%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Time Management</span>
                <span className="text-emerald-400 font-semibold">Intermediate</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Adaptability</span>
                <span className="text-emerald-400 font-semibold">Advanced</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Skills Development Path */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Skills Development Path</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Recommended Courses</h3>
              <ul className="space-y-2">
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Advanced Machine Learning</span>
                  <span className="text-emerald-400">40% Complete</span>
                </li>
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Cloud Computing Fundamentals</span>
                  <span className="text-emerald-400">25% Complete</span>
                </li>
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>DevOps Practices</span>
                  <span className="text-emerald-400">10% Complete</span>
                </li>
              </ul>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Certification Goals</h3>
              <ul className="space-y-2">
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>AWS Cloud Practitioner</span>
                  <span className="text-emerald-400">Pending</span>
                </li>
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Google Cloud Associate</span>
                  <span className="text-emerald-400">In Progress</span>
                </li>
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Microsoft Azure Fundamentals</span>
                  <span className="text-emerald-400">Goal</span>
                </li>
              </ul>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Learning Activities</h3>
              <ul className="space-y-2">
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Project: Portfolio Optimization</span>
                  <span className="text-emerald-400">Active</span>
                </li>
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Research Paper: AI Ethics</span>
                  <span className="text-emerald-400">Review</span>
                </li>
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Internship: Software Dev</span>
                  <span className="text-emerald-400">Upcoming</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Skill Assessment */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Skill Assessments</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Skill</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Assessment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Python Programming</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Advanced Concepts</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">92/100</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Jan 15, 2024</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Passed</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button className="text-emerald-400 hover:text-emerald-300">Retake</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">JavaScript Fundamentals</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">ES6 Features</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">88/100</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Jan 10, 2024</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">Passed</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button className="text-emerald-400 hover:text-emerald-300">Retake</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">React Development</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Components & Hooks</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">76/100</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Feb 5, 2024</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-500/20 text-yellow-400">Review</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button className="text-emerald-400 hover:text-emerald-300">Retake</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Problem Solving</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Algorithms</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-400">--</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">Scheduled</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/20 text-blue-400">Pending</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button className="text-emerald-400 hover:text-emerald-300">Schedule</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}