'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/authContext';
import { Navbar } from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { user, backendUser, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const scrollerContent = scroller.querySelector('[data-scroller-content]');
    if (!scrollerContent) return;

    // Clone items for continuous scroll effect
    const items = Array.from(scrollerContent.children);
    items.forEach(item => {
      const clone = item.cloneNode(true);
      scrollerContent.appendChild(clone);
    });
  }, []);

  // Define sidebar navigation items
  const sidebarItems = [
    { label: 'Overview', href: '/dashboard/student', icon: '🏠' },
    { label: 'Growth Hub', href: '/dashboard/student/growth', icon: '📈' },
    { label: 'Career Profile', href: '/dashboard/student/career', icon: '💼' },
    { label: 'AI Chatbot', href: '/dashboard/student/chatbot', icon: '🤖' },
    { label: 'Research Wing', href: '/dashboard/student/research', icon: '🔬' },
    { label: 'Code Arena', href: '/dashboard/student/code', icon: '💻' },
    { label: 'Academic Records', href: '/dashboard/student/records', icon: '📚' },
    { label: 'Skills Tracker', href: '/dashboard/student/skills', icon: '🎯' },
  ];

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
    <div className="min-h-screen bg-slate-900">
      {/* Scrolling Announcement Banner */}
      <div 
        ref={scrollerRef}
        className="w-full bg-emerald-600 overflow-hidden py-2"
      >
        <div 
          data-scroller-content
          className="flex whitespace-nowrap animate-scroll gap-12"
        >
          <span className="text-white text-sm font-medium px-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            AI-Powered Growth Tracking Now Live
          </span>
          <span className="text-white text-sm font-medium px-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            New: Emotional Intelligence Chatbot Available 24/7
          </span>
          <span className="text-white text-sm font-medium px-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Bug Bounty Challenge: Earn Up to 5,000 Points
          </span>
          <span className="text-white text-sm font-medium px-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Research Wing: AI-Assisted Publication Support
          </span>
        </div>
      </div>

      {/* Navigation Bar */}
      <Navbar />

      {/* Dashboard Layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <Sidebar items={sidebarItems} />
          
          {/* Main Content Area */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          animation: scroll 40s linear infinite;
        }
      `}</style>
    </div>
  );
}