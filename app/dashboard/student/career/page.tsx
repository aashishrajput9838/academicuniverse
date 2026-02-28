'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export default function StudentCareerProfile() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Career & Verified Profile</h1>
        <p className="text-slate-400">Build your professional presence and showcase your achievements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Centralized Presence */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Centralized Presence</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Professional Profile</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Profile Completeness</span>
                  <span className="text-emerald-400">85%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Online Presence</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">LinkedIn</span>
                  <span className="text-emerald-400">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">GitHub</span>
                  <span className="text-emerald-400">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Portfolio</span>
                  <span className="text-slate-400">Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Certifications</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <h3 className="font-semibold text-blue-400">Completed</h3>
              <ul className="mt-2 space-y-2">
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Advanced Python Programming</span>
                  <span className="text-emerald-400">Verified</span>
                </li>
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Data Structures & Algorithms</span>
                  <span className="text-emerald-400">Verified</span>
                </li>
                <li className="flex justify-between text-slate-300 text-sm">
                  <span>Web Development Fundamentals</span>
                  <span className="text-emerald-400">Verified</span>
                </li>
              </ul>
            </div>
            
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <h3 className="font-semibold text-yellow-400">In Progress</h3>
              <ul className="mt-2 space-y-2">
                <li className="text-slate-300 text-sm">
                  Machine Learning Basics
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Resume Section */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Resume Builder</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-3">Education</h3>
              <div className="space-y-3">
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                  <h4 className="font-medium text-emerald-400">Bachelor of Technology</h4>
                  <p className="text-slate-400 text-sm">Computer Science Engineering</p>
                  <p className="text-slate-400 text-sm">Sharda University • 2023 - Present</p>
                  <p className="text-emerald-400 text-sm">CGPA: 8.5/10</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-3">Experience</h3>
              <div className="space-y-3">
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                  <h4 className="font-medium text-emerald-400">Software Developer Intern</h4>
                  <p className="text-slate-400 text-sm">Tech Solutions Inc. • Summer 2024</p>
                  <p className="text-slate-400 text-sm">Developed web applications using React and Node.js</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Skills</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center">
              <div className="text-emerald-400 text-2xl mb-2">🐍</div>
              <h3 className="font-semibold text-white text-sm">Python</h3>
              <p className="text-slate-400 text-xs">Expert</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center">
              <div className="text-emerald-400 text-2xl mb-2">⚛️</div>
              <h3 className="font-semibold text-white text-sm">React</h3>
              <p className="text-slate-400 text-xs">Advanced</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center">
              <div className="text-emerald-400 text-2xl mb-2">🌐</div>
              <h3 className="font-semibold text-white text-sm">JavaScript</h3>
              <p className="text-slate-400 text-xs">Advanced</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center">
              <div className="text-emerald-400 text-2xl mb-2">💾</div>
              <h3 className="font-semibold text-white text-sm">SQL</h3>
              <p className="text-slate-400 text-xs">Intermediate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}