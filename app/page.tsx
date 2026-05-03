'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { Navbar } from '@/components/Navbar'
import { HeroSection } from '@/components/HeroSection'
import { FeaturedPrograms } from '@/components/FeaturedPrograms'
import { CTASection } from '@/components/CTASection'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, UserCheck, Calendar, Settings } from 'lucide-react'

export default function AcademicUniverseHome() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const { user, backendUser, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  // All hooks must be called unconditionally at the top level
  useEffect(() => {
    // Only check role and redirect when both user and backendUser are loaded
    if (user && !loading && backendUser) {
      const isAdminUser = (
        backendUser.role === 'ADMIN' || 
        backendUser.role === 'SUPER_ADMIN' || 
        (backendUser as any).permissions?.includes('MANAGE_USERS')
      );
      
      if (isAdminUser) {
        setIsAdmin(true);
      } else {
        // Redirect non-admin users to their respective dashboards based on role
        if (backendUser.role === 'STUDENT') {
          router.push('/dashboard/student');
        } else if (backendUser.role === 'FACULTY') {
          router.push('/dashboard/faculty');
        } else {
          router.push('/dashboard/student'); // default redirect
        }
      }
    }
    // If backendUser is not yet loaded but user is authenticated,
    // we'll wait for the backendUser to load before making a decision
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
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    )
  }

  // Show the public landing page for unauthenticated visitors
  if (!user) {
    return (
      <>
        <Navbar />
        <main className="bg-slate-950 text-white">
          <HeroSection />
          <FeaturedPrograms />
          <CTASection />
          <Footer />
        </main>
      </>
    )
  }

  // Still loading backend user data - show loading state
  if (!backendUser && user && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
        <span className="ml-3 text-white">Loading user data...</span>
      </div>
    )
  }

  // If user is admin, render admin dashboard
  if (isAdmin) {
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
              Admin Control Panel Active
            </span>
            <span className="text-white text-sm font-medium px-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              System Monitoring Active
            </span>
            <span className="text-white text-sm font-medium px-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Security Status: Protected
            </span>
            <span className="text-white text-sm font-medium px-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Admin Functions Ready
            </span>
          </div>
        </div>

        {/* Navigation Bar */}
        <Navbar />

        {/* Admin Dashboard Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Admin <span className="text-emerald-400">Control Panel</span>
            </h1>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Manage Academic Universe System Settings
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
              <span>ADMIN</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Section Management Card */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 hover:border-emerald-500 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <div className="bg-emerald-500/20 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-emerald-400" />
                  </div>
                  Section Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 mb-4">Create, update, and delete sections</p>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push('/admin/sections')}>
                  Manage Sections
                </Button>
              </CardContent>
            </Card>
            
            {/* Representative Assignment Card */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 hover:border-emerald-500 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <UserCheck className="h-5 w-5 text-blue-400" />
                  </div>
                  Representative Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 mb-4">Assign section representatives</p>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push('/admin/assign-representative')}>
                  Assign Representatives
                </Button>
              </CardContent>
            </Card>
            
            {/* Timetable Monitor Card */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 hover:border-emerald-500 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <div className="bg-purple-500/20 p-2 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-400" />
                  </div>
                  Timetable Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 mb-4">View uploaded timetable status</p>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push('/admin/timetable-status')}>
                  View Status
                </Button>
              </CardContent>
            </Card>
            
            {/* User Management Card */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 hover:border-emerald-500 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <div className="bg-orange-500/20 p-2 rounded-lg">
                    <Settings className="h-5 w-5 text-orange-400" />
                  </div>
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 mb-4">View and manage system users</p>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push('/admin/users')}>
                  Manage Users
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Admin Tools */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">System Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <h3 className="font-semibold text-white mb-2">System Logs</h3>
                <p className="text-slate-400 text-sm mb-3">Monitor system activity and events</p>
                <Button variant="outline" className="text-emerald-400 border-emerald-400 hover:bg-emerald-400/10">
                  View Logs
                </Button>
              </div>
              
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <h3 className="font-semibold text-white mb-2">Database Backup</h3>
                <p className="text-slate-400 text-sm mb-3">Create and manage system backups</p>
                <Button variant="outline" className="text-emerald-400 border-emerald-400 hover:bg-emerald-400/10">
                  Backup Now
                </Button>
              </div>
              
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <h3 className="font-semibold text-white mb-2">Performance Metrics</h3>
                <p className="text-slate-400 text-sm mb-3">Monitor system performance</p>
                <Button variant="outline" className="text-emerald-400 border-emerald-400 hover:bg-emerald-400/10">
                  View Metrics
                </Button>
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

  // Non-admin users will be redirected by the useEffect hook, so this shouldn't render
  return null;
}
