'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navbar } from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useModuleVisibility } from '@/lib/moduleVisibility';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { user, backendUser, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [eventsCount, setEventsCount] = useState(0);
  const { isModuleVisible, loading: modulesLoading } = useModuleVisibility();

  const SIDEBAR_MODULE_MAP: Record<string, string> = {
    '/dashboard/student/profile': 'profile',
    '/dashboard/student/events': 'events',
    '/dashboard/student/mail': 'mail',
    '/dashboard/student/growth': 'growth-hub',
    '/dashboard/student/document-intelligence': 'document-intelligence',
    '/dashboard/student/schedule': 'academic-schedule',
    '/dashboard/student/career': 'career-profile',
    '/dashboard/student/chatbot': 'ai-chatbot',
    '/dashboard/student/research': 'research-wing',
    '/dashboard/student/code': 'code-arena',
    '/dashboard/student/records': 'academic-records',
    '/dashboard/student/ezone-sync': 'sync-college-profile',
    '/dashboard/student/webscrap': 'webscrap',
    '/dashboard/student/skills': 'skills-tracker',
    '/dashboard/student/resume-builder': 'resume-builder',
    '/dashboard/student/overlap': 'overlap-engine',
    '/dashboard/student/faculty-cabin': 'find-faculty-cabin',
  };

  useEffect(() => {
    if (!user) return;
    const fetchEventCount = async () => {
      try {
        const eventsRef = collection(db, 'detected_events');
        const q = query(eventsRef, where('userId', '==', user.uid));
        const snap = await getDocs(q);
        setEventsCount(snap.size);
      } catch (err) {
        console.error("Failed to fetch event count for badge", err);
      }
    };
    fetchEventCount();
  }, [user]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const scrollerContent = scroller.querySelector('[data-scroller-content]');
    if (!scrollerContent) return;

    const items = Array.from(scrollerContent.children);
    items.forEach(item => {
      const clone = item.cloneNode(true);
      scrollerContent.appendChild(clone);
    });
  }, []);

  const allSidebarItems = [
    { label: 'Profile', href: '/dashboard/student/profile', icon: '👤' },
    { label: 'Events from Gmail', href: '/dashboard/student/events', icon: '📧', badge: eventsCount },
    { label: 'Mail Explorer', href: '/dashboard/student/mail', icon: '✉️' },
    { label: 'Growth Hub', href: '/dashboard/student/growth', icon: '📈' },
    { label: 'Document Intelligence', href: '/dashboard/student/document-intelligence', icon: '🧠' },
    { label: 'Academic Schedule', href: '/dashboard/student/schedule', icon: '📅' },
    { label: 'Career Profile', href: '/dashboard/student/career', icon: '💼' },
    { label: 'AI Chatbot', href: '/dashboard/student/chatbot', icon: '🤖' },
    { label: 'Research Wing', href: '/dashboard/student/research', icon: '🔬' },
    { label: 'Code Arena', href: '/dashboard/student/code', icon: '💻' },
    { label: 'Academic Records', href: '/dashboard/student/records', icon: '📚' },
    { label: 'Sync College Profile', href: '/dashboard/student/ezone-sync', icon: '🔄' },
    { label: 'Webscrap', href: '/dashboard/student/webscrap', icon: '🕷️' },
    { label: 'Skills Tracker', href: '/dashboard/student/skills', icon: '🎯' },
    { label: 'Resume Builder', href: '/dashboard/student/resume-builder', icon: '📄' },
    { label: 'Overlap Engine', href: '/dashboard/student/overlap', icon: '📅' },
    { label: 'Find Faculty Cabin', href: '/dashboard/student/faculty-cabin', icon: '🚪' },
  ];

  const sidebarItems = allSidebarItems.filter(item => {
    const moduleKey = SIDEBAR_MODULE_MAP[item.href];
    return moduleKey ? isModuleVisible(moduleKey) : true;
  });

  if (loading || modulesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  if (!user || !backendUser || backendUser.role !== 'STUDENT') {
    return null;
  }

  const currentModuleKey = SIDEBAR_MODULE_MAP[pathname];
  if (currentModuleKey && !isModuleVisible(currentModuleKey)) {
    router.replace('/dashboard/student');
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