'use client';

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { Navbar } from '@/components/Navbar'

export default function FacultyDashboard() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const { user, backendUser, loading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated or if user is not a faculty
  useEffect(() => {
    if (!loading && (!user || !backendUser)) {
      router.push('/login')
    } else if (!loading && backendUser && backendUser.role !== 'FACULTY') {
      // Redirect students to their respective dashboard
      router.push('/dashboard/student')
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

  // Don't render content until user is authenticated and is a faculty
  if (!user || !backendUser || backendUser.role !== 'FACULTY') {
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
            Faculty Portal Enhanced with New Tools
          </span>
          <span className="text-white text-sm font-medium px-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Student Performance Analytics Available
          </span>
          <span className="text-white text-sm font-medium px-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Grade Management System Updated
          </span>
          <span className="text-white text-sm font-medium px-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Research Collaboration Tools Launched
          </span>
        </div>
      </div>

      {/* Navigation Bar */}
      <Navbar />

      {/* Faculty Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Faculty <span className="text-emerald-400">Dashboard</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Manage your courses, monitor student progress, and access academic tools
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-emerald-400">24</div>
            <div className="text-slate-400 mt-2">Courses Managed</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-emerald-400">186</div>
            <div className="text-slate-400 mt-2">Students Supervised</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-emerald-400">12</div>
            <div className="text-slate-400 mt-2">Research Projects</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-emerald-400">94%</div>
            <div className="text-slate-400 mt-2">Course Satisfaction</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Student Management */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">Student Management</h2>
              <p className="text-slate-400 mb-4">
                Monitor and evaluate student progress with our analytics tools
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="font-semibold text-emerald-400 mb-2">Performance Analytics</h3>
                  <p className="text-slate-400 text-sm">Track individual and group progress</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="font-semibold text-emerald-400 mb-2">Grade Management</h3>
                  <p className="text-slate-400 text-sm">Add, edit, and review student grades</p>
                </div>
              </div>
            </div>

            {/* Course & Curriculum */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">Course & Curriculum</h2>
              <p className="text-slate-400 mb-4">
                Manage course materials and curriculum content
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="font-semibold text-emerald-400 mb-2">Course Materials</h3>
                  <p className="text-slate-400 text-sm">Upload and organize learning resources</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="font-semibold text-emerald-400 mb-2">Curriculum Design</h3>
                  <p className="text-slate-400 text-sm">Plan and update course structures</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* AI Assistant */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">AI Assistant</h2>
              <p className="text-slate-400 mb-4">
                Get administrative support and insights
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-400 text-sm">Administrative Support Available</p>
              </div>
            </div>

            {/* Research Wing */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">Research Wing</h2>
              <p className="text-slate-400 mb-4">
                Collaborate on research and publication projects
              </p>
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-emerald-400 mb-2">Collaboration Tools</h3>
                <p className="text-slate-400 text-sm">Connect with researchers globally</p>
              </div>
            </div>

            {/* Faculty Resources */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">Faculty Resources</h2>
              <p className="text-slate-400 mb-4">
                Access teaching aids and professional development
              </p>
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-emerald-400 mb-2">Teaching Tools</h3>
                <p className="text-slate-400 text-sm">Resources for enhanced learning</p>
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