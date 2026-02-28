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
    // Redirect to login if not authenticated
    if (!user && !loading) {
      router.push('/login');
      return;
    }
    
    // Don't redirect authenticated users - let them stay on home page
    // They can navigate to dashboard via the navbar
  }, [user, loading, router]);

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
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    )
  }

  // Don't render content until user is authenticated
  if (!user) {
    return null
  }

  // Render home page content for authenticated users

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

      {/* Home Page Content for Authenticated Users */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Welcome to <span className="text-emerald-400">Academic Universe</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Your AI-powered student growth ecosystem. Track your progress, connect with peers, and unlock your potential.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 text-center">
            <div className="text-emerald-400 text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">Growth Tracking</h3>
            <p className="text-slate-400">Monitor your academic and personal development with AI-powered insights</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 text-center">
            <div className="text-emerald-400 text-4xl mb-4">🧠</div>
            <h3 className="text-xl font-semibold text-white mb-2">AI Assistance</h3>
            <p className="text-slate-400">Get personalized recommendations and emotional intelligence support</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 text-center">
            <div className="text-emerald-400 text-4xl mb-4">🎓</div>
            <h3 className="text-xl font-semibold text-white mb-2">Verified Credentials</h3>
            <p className="text-slate-400">Showcase your achievements with blockchain-verified certificates</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-slate-400 mb-6">
            Navigate to your personalized dashboard using the menu above to access your specific tools and resources.
          </p>
          <div className="inline-flex gap-4">
            <a 
              href="/dashboard/student" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-lg transition"
            >
              Go to Student Dashboard
            </a>
            <a 
              href="/dashboard/faculty" 
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-6 py-3 rounded-lg transition"
            >
              Go to Faculty Dashboard
            </a>
          </div>
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
  )
}
