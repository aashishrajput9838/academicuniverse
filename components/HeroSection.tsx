'use client'

import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="relative min-h-[700px] bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Animated Gradient Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative max-w-7xl mx-auto px-6 py-20 flex items-center min-h-[700px]">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
          {/* Left Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                Beyond Marks & Attendance:
                <span className="block mt-2 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  The First AI Ecosystem that Understands Your Growth.
                </span>
              </h1>
            </div>

            <p className="text-xl text-slate-300 leading-relaxed max-w-xl">
              Track your IQ/EQ trends, manage burnout with AI, and build a verified professional profile for recruiters—all in one place.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link 
                href="/analyze"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-8 py-4 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition shadow-xl shadow-emerald-500/30 text-lg"
              >
                Analyze My Growth Pattern
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link 
                href="/demo"
                className="inline-flex items-center gap-2 border-2 border-slate-500 text-slate-300 font-semibold px-8 py-4 rounded-xl hover:bg-slate-800 hover:border-slate-400 transition text-lg"
              >
                Watch Demo
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">10K+</div>
                <div className="text-sm text-slate-400">Students</div>
              </div>
              <div className="w-px h-12 bg-slate-600" />
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">500+</div>
                <div className="text-sm text-slate-400">Faculty</div>
              </div>
              <div className="w-px h-12 bg-slate-600" />
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">95%</div>
                <div className="text-sm text-slate-400">Growth Rate</div>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Mockup */}
          <div className="relative lg:pl-8">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 shadow-2xl">
              {/* Mockup Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">Growth Analytics</h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full">Live</span>
              </div>

              {/* Graph Area */}
              <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                <div className="flex items-end justify-between h-40 gap-2">
                  {/* Simulated bar chart */}
                  {[65, 72, 58, 80, 75, 88, 92].map((height, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs text-slate-500">W{i + 1}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 text-sm">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    Logical Thinking +12%
                  </span>
                  <span className="text-slate-400">This Week</span>
                </div>
              </div>

              {/* AI Alert */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-amber-400 font-medium text-sm">AI Alert: Stress Level Rising</h4>
                    <p className="text-slate-400 text-xs mt-1">
                      Performance drop detected due to potential burnout. Consider taking a break.
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">128</div>
                  <div className="text-xs text-slate-400">IQ Score</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">85</div>
                  <div className="text-xs text-slate-400">EQ Score</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">6/10</div>
                  <div className="text-xs text-slate-400">Stress</div>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-4 -left-4 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">AI Verified</div>
                  <div className="text-slate-400 text-xs">Profile Complete</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
