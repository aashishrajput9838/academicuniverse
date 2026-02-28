'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { Navbar } from '@/components/Navbar'

export default function AcademicUniverseHome() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const { user, backendUser, loading } = useAuth()
  const router = useRouter()

  // All hooks must be called unconditionally at the top level
  useEffect(() => {
    // Prevent multiple redirects
    if (loading) return;
    
    // Redirect to login if not authenticated
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Wait for backend user data to load before redirecting
    if (user && !backendUser) {
      // Still loading backend user data, show loading state
      return;
    }
    
    // Only redirect if we have both user and backendUser data
    if (user && backendUser) {
      // Redirect to appropriate dashboard based on user role
      if (backendUser.role === 'FACULTY') {
        router.push('/dashboard/faculty');
      } else {
        // Default to student dashboard for STUDENT role or any other role
        router.push('/dashboard/student');
      }
    }
  }, [user, backendUser, loading, router]);

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const scrollerContent = scroller.querySelector('[data-scroller-content]')
    if (!scrollerContent) return

    // Clone items for continuous scroll effect
    const items = Array.from(scrollerContent.children)
    items.forEach(item => {
      const clone = item.cloneNode(true)
      scrollerContent.appendChild(clone)
    })
  }, [])

  // Show loading state while checking authentication
  if (loading || (user && !backendUser)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50 mx-auto mb-4" />
          <p className="text-white">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Don't render content until user is authenticated
  if (!user) {
    return null
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

      {/* Loading state - this should not be reached due to redirects */}
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50 mx-auto mb-4" />
        <p className="text-white">Loading dashboard...</p>
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
  )
}
