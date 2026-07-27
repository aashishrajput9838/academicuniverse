'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useModuleVisibility } from '@/lib/moduleVisibility';
import Link from 'next/link';

export default function StudentDashboardOverview() {
  const { user, backendUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isModuleVisible, loading: modulesLoading } = useModuleVisibility();

  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    } else if (!authLoading && backendUser && backendUser.role !== 'STUDENT' && backendUser.role !== 'FACULTY') {
      router.push('/');
    }
  }, [user, backendUser, authLoading, router]);

  if (authLoading || modulesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50 mx-auto" />
          <p className="text-slate-400 animate-pulse text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !backendUser || backendUser.role !== 'STUDENT') {
    return null;
  }

  const quickLinks = [
    { key: 'growth-hub', label: 'Growth Hub', icon: '📈', description: 'Track your academic progress', href: '/dashboard/student/growth' },
    { key: 'ai-chatbot', label: 'AI Chatbot', icon: '🤖', description: 'Get instant help and guidance', href: '/dashboard/student/chatbot' },
    { key: 'resume-builder', label: 'Resume Builder', icon: '📄', description: 'Create professional resumes', href: '/dashboard/student/resume-builder' },
  ].filter(link => isModuleVisible(link.key));

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome</h1>
          <p className="text-slate-400 mt-1 text-sm md:text-base">
            Use the left sidebar to access all features.
          </p>
        </div>
      </div>

      {/* Info Section */}
      <div className="w-full bg-slate-800/40 backdrop-blur-md rounded-2xl p-8 border border-slate-700/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-700" />
        
        <div className="relative z-10 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mx-auto">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Academic Universe</h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              Explore all available features using the navigation menu on the left.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickLinks.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 hover:border-emerald-500/30 transition-all block"
          >
            <div className="text-emerald-400 mb-2">{link.icon}</div>
            <div className="text-white font-bold text-lg mb-1">{link.label}</div>
            <div className="text-slate-500 text-sm">{link.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
