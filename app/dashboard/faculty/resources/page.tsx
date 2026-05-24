'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function FacultyResources() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Faculty Resources</h1>
        <p className="text-slate-400">Access teaching aids and professional development</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Teaching Tools */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Teaching Tools</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Lesson Planning</h3>
              <p className="text-slate-400 text-sm mb-3">Create and organize course materials</p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Plan Lesson
              </button>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Presentation Tools</h3>
              <p className="text-slate-400 text-sm mb-3">Access interactive presentation software</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Use Tools
              </button>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Assessment Builder</h3>
              <p className="text-slate-400 text-sm mb-3">Create quizzes and assignments</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Build Assessment
              </button>
            </div>
          </div>
        </div>

        {/* Professional Development */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Professional Development</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Workshops</h3>
              <p className="text-slate-400 text-sm mb-3">Attend skill-building sessions</p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Browse Workshops
              </button>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Certification Programs</h3>
              <p className="text-slate-400 text-sm mb-3">Advance your qualifications</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Explore Programs
              </button>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Conferences</h3>
              <p className="text-slate-400 text-sm mb-3">Stay updated with latest research</p>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
                View Conferences
              </button>
            </div>
          </div>
        </div>

        {/* Resource Library */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Resource Library</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Educational Materials</h3>
              <p className="text-slate-400 text-sm mb-3">Textbooks, articles, and educational resources</p>
              <button className="text-emerald-400 hover:text-emerald-300 text-sm">Browse Materials</button>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Teaching Methodologies</h3>
              <p className="text-slate-400 text-sm mb-3">Best practices and innovative teaching methods</p>
              <button className="text-emerald-400 hover:text-emerald-300 text-sm">Explore Methods</button>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Student Engagement</h3>
              <p className="text-slate-400 text-sm mb-3">Tools and techniques to improve student involvement</p>
              <button className="text-emerald-400 hover:text-emerald-300 text-sm">View Strategies</button>
            </div>
          </div>
        </div>

        {/* Faculty Support */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Faculty Support</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center">
              <div className="text-2xl mb-2">📞</div>
              <h3 className="font-semibold text-white text-sm">Help Desk</h3>
              <p className="text-slate-400 text-xs">Technical support</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center">
              <div className="text-2xl mb-2">📅</div>
              <h3 className="font-semibold text-white text-sm">Scheduling</h3>
              <p className="text-slate-400 text-xs">Meeting coordination</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center">
              <div className="text-2xl mb-2">💰</div>
              <h3 className="font-semibold text-white text-sm">Financial Aid</h3>
              <p className="text-slate-400 text-xs">Budget requests</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center">
              <div className="text-2xl mb-2">🎓</div>
              <h3 className="font-semibold text-white text-sm">HR Services</h3>
              <p className="text-slate-400 text-xs">Personnel matters</p>
            </div>
          </div>
        </div>

        {/* My Development Plan */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">My Development Plan</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-white">Complete Advanced Pedagogy Course</h3>
                <span className="text-emerald-400 text-sm">75% Complete</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
              <p className="text-slate-400 text-sm mt-2">Due: March 30, 2024</p>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-white">Attend AI in Education Workshop</h3>
                <span className="text-emerald-400 text-sm">25% Complete</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '25%' }}></div>
              </div>
              <p className="text-slate-400 text-sm mt-2">Due: April 15, 2024</p>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-white">Publish Research Paper</h3>
                <span className="text-emerald-400 text-sm">10% Complete</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '10%' }}></div>
              </div>
              <p className="text-slate-400 text-sm mt-2">Due: June 30, 2024</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}