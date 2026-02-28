'use client';

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { Navbar } from '@/components/Navbar'

export default function StudentDashboard() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const { user, backendUser, loading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated or if user is not a student
  useEffect(() => {
    if (!loading && (!user || !backendUser)) {
      router.push('/login')
    } else if (!loading && backendUser && backendUser.role !== 'STUDENT') {
      // Redirect faculty members to their respective dashboard
      router.push('/dashboard/faculty')
    }
  }, [user, backendUser, loading, router])

  // All hooks must be called unconditionally at the top level
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

  // Don't render content until user is authenticated and is a student
  if (!user || !backendUser || backendUser.role !== 'STUDENT') {
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

      {/* Student Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Student <span className="text-emerald-400">Dashboard</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Access all your academic tools, track your growth, and connect with your learning community
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-emerald-400">85%</div>
            <div className="text-slate-400 mt-2">Growth Rate</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-emerald-400">A+</div>
            <div className="text-slate-400 mt-2">Current GPA</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-emerald-400">42</div>
            <div className="text-slate-400 mt-2">Skills Acquired</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-emerald-400">27</div>
            <div className="text-slate-400 mt-2">Projects Completed</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Growth Hub */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">Growth Hub</h2>
              <p className="text-slate-400 mb-4">
                Track your intellectual and emotional growth with our AI-powered analytics
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="font-semibold text-emerald-400 mb-2">IQ/EQ Trends</h3>
                  <p className="text-slate-400 text-sm">Monitor your cognitive and emotional intelligence progress</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="font-semibold text-emerald-400 mb-2">Growth Analysis</h3>
                  <p className="text-slate-400 text-sm">Identify areas for improvement and track degradation</p>
                </div>
              </div>
            </div>

            {/* Career & Verified Profile */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">Career & Verified Profile</h2>
              <p className="text-slate-400 mb-4">
                Build your professional presence and showcase your achievements
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="font-semibold text-emerald-400 mb-2">Centralized Presence</h3>
                  <p className="text-slate-400 text-sm">Unified profile across platforms</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="font-semibold text-emerald-400 mb-2">Certifications</h3>
                  <p className="text-slate-400 text-sm">Verify and showcase your credentials</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* AI Chatbot */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">AI Chatbot</h2>
              <p className="text-slate-400 mb-4">
                Get 24/7 emotional support and academic guidance
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-400 text-sm">Emotional Support Available</p>
              </div>
            </div>

            {/* Research Wing */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">Research Wing</h2>
              <p className="text-slate-400 mb-4">
                Access research tools and publication support
              </p>
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-emerald-400 mb-2">Publication Support</h3>
                <p className="text-slate-400 text-sm">AI-assisted research paper creation</p>
              </div>
            </div>

            {/* Code Arena */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">Code Arena</h2>
              <p className="text-slate-400 mb-4">
                Compete and enhance your coding skills
              </p>
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-emerald-400 mb-2">Coding Challenges</h3>
                <p className="text-slate-400 text-sm">Practice and compete with peers</p>
              </div>
            </div>
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