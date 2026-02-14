'use client'

import Link from 'next/link'

// Feature 1: Verified Record
function VerifiedRecordSection() {
  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Verified Credentials
            </div>
            <h2 className="text-4xl font-bold text-white">
              The Verified Record
            </h2>
            <p className="text-xl text-slate-300">
              No more Google Forms. One centralized, trusted profile for Faculty and Recruiters.
            </p>
            <p className="text-slate-400">
              Every achievement, certification, and milestone is verified by faculty members and stored securely. Recruiters can trust what they see.
            </p>
            <Link 
              href="/profile"
              className="inline-flex items-center gap-2 text-emerald-400 font-medium hover:text-emerald-300 transition"
            >
              Create Your Verified Profile
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Profile Card Preview */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                AS
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold text-lg">Aashi Sharma</h3>
                  <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">B.Tech Computer Science • 3rd Year</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { type: 'Hackathon', title: 'Smart India Hackathon Winner', status: 'Verified', color: 'emerald' },
                { type: 'Research', title: 'IEEE Published Paper', status: 'Verified', color: 'blue' },
                { type: 'Internship', title: 'Google SWE Intern', status: 'Verified', color: 'amber' },
                { type: 'Certification', title: 'AWS Solutions Architect', status: 'Pending', color: 'slate' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded bg-${item.color}-500/20 text-${item.color}-400`}>
                      {item.type}
                    </span>
                    <span className="text-white text-sm">{item.title}</span>
                  </div>
                  <span className={`text-xs ${item.status === 'Verified' ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {item.status === 'Verified' ? '✓ Verified' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Feature 2: Holistic Growth Engine
function HolisticGrowthSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            AI-Powered Analytics
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Holistic Growth Engine
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Weekly IQ & EQ assessments combined with AI-powered growth degradation alerts.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Weekly Assessment Results */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Weekly IQ & EQ Assessment
            </h3>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300">Logical Thinking</span>
                  <span className="text-emerald-400">85%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300">Problem Solving</span>
                  <span className="text-emerald-400">78%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full w-[78%] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300">Emotional Awareness</span>
                  <span className="text-purple-400">72%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full w-[72%] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300">Social Skills</span>
                  <span className="text-purple-400">68%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full w-[68%] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: AI Growth Degradation Alert */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              AI Growth Degradation Analysis
            </h3>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-amber-400 font-semibold">Alert: Performance Drop Detected</h4>
                  <p className="text-slate-300 text-sm mt-2">
                    Analysis indicates potential burnout. Your problem-solving scores have dropped 15% over the last 2 weeks while stress indicators are elevated.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-slate-300 text-sm font-medium">AI Recommendations:</h4>
              {[
                'Take short breaks every 45 minutes during study sessions',
                'Consider speaking with our AI Emotional Support chatbot',
                'Reduce competitive coding practice for this week',
              ].map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {rec}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Feature 3: AI Support Systems
function AISupportSection() {
  return (
    <section className="py-20 bg-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            AI-Powered Assistance
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            AI Support Systems
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            From emotional wellbeing to research excellence, our AI assistants have you covered.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Emotional Intelligence Chatbot */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-pink-500/20 rounded-xl">
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Emotional Intelligence Chatbot</h3>
                <p className="text-slate-400 text-sm">24/7 Support for Your Wellbeing</p>
              </div>
            </div>

            {/* Chat Preview */}
            <div className="bg-slate-900/50 rounded-xl p-4 space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="bg-slate-800 rounded-lg rounded-tl-none p-3 max-w-[80%]">
                  <p className="text-slate-300 text-sm">
                    Hi! I noticed you've been studying late for 5 days straight. Feeling placement anxiety? Let's talk about it. 💙
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <div className="bg-emerald-600 rounded-lg rounded-tr-none p-3 max-w-[80%]">
                  <p className="text-white text-sm">
                    Yeah, the placement season is stressing me out...
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="bg-slate-800 rounded-lg rounded-tl-none p-3 max-w-[80%]">
                  <p className="text-slate-300 text-sm">
                    That's completely normal. Let me share some techniques that helped other students manage placement anxiety effectively...
                  </p>
                </div>
              </div>
            </div>

            <Link 
              href="/chatbot"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-pink-500/20 text-pink-400 font-medium px-4 py-3 rounded-xl hover:bg-pink-500/30 transition"
            >
              Start a Conversation
            </Link>
          </div>

          {/* Research Assistant */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Research Assistant</h3>
                <p className="text-slate-400 text-sm">AI-Powered Publication Support</p>
              </div>
            </div>

            {/* Research UI Preview */}
            <div className="bg-slate-900/50 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">Current Project</span>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Structuring Phase</span>
              </div>

              <div className="border-l-2 border-blue-500 pl-4">
                <h4 className="text-white font-medium">ML-Based Attendance System</h4>
                <p className="text-slate-400 text-sm mt-1">Using facial recognition with privacy preservation</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide">AI Suggestions</p>
                {[
                  { icon: '📋', text: 'Paper Structure: IMRaD format recommended' },
                  { icon: '📚', text: 'Journal: IEEE Access (Impact Factor: 3.9)' },
                  { icon: '🔍', text: 'Add: Privacy comparison with existing methods' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2 text-sm">
                    <span>{item.icon}</span>
                    <span className="text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link 
              href="/research"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-blue-500/20 text-blue-400 font-medium px-4 py-3 rounded-xl hover:bg-blue-500/30 transition"
            >
              Start Your Research
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// Feature 4: Competitive Arena
function CompetitiveArenaSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 px-4 py-2 rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Competitive Coding
            </div>
            <h2 className="text-4xl font-bold text-white">
              Code Arena
            </h2>
            <p className="text-xl text-slate-300">
              We don't invent problems; we fetch them from the experts and track your growth.
            </p>
            <p className="text-slate-400">
              Seamlessly integrate your LeetCode, Codeforces, and GitHub profiles. Track progress, earn points, and participate in Bug Bounty challenges.
            </p>

            {/* Platform Icons */}
            <div className="flex items-center gap-6 pt-4">
              {[
                { name: 'LeetCode', color: 'bg-amber-500' },
                { name: 'Codeforces', color: 'bg-blue-500' },
                { name: 'GitHub', color: 'bg-slate-500' },
                { name: 'HackerRank', color: 'bg-emerald-500' },
              ].map((platform) => (
                <div key={platform.name} className="text-center">
                  <div className={`w-12 h-12 ${platform.color} rounded-xl flex items-center justify-center mb-2`}>
                    <span className="text-white font-bold text-lg">{platform.name[0]}</span>
                  </div>
                  <span className="text-xs text-slate-400">{platform.name}</span>
                </div>
              ))}
            </div>

            <Link 
              href="/code-arena"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold px-6 py-3 rounded-xl hover:from-orange-600 hover:to-amber-600 transition shadow-lg shadow-orange-500/25"
            >
              Connect Your Profiles
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Stats Preview */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">Your Coding Stats</h3>
              <span className="text-xs text-slate-400">Last synced: 2 min ago</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-amber-400">458</div>
                <div className="text-xs text-slate-400 mt-1">Problems Solved</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">1847</div>
                <div className="text-xs text-slate-400 mt-1">CF Rating</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-emerald-400">2.5K</div>
                <div className="text-xs text-slate-400 mt-1">Bug Bounty Pts</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Easy</span>
                <span className="text-emerald-400">180 solved</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full w-[90%] bg-emerald-500 rounded-full"></div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Medium</span>
                <span className="text-amber-400">215 solved</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full w-[65%] bg-amber-500 rounded-full"></div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Hard</span>
                <span className="text-red-400">63 solved</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full w-[25%] bg-red-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Feature 5: Gamification & Rankings
function GamificationSection() {
  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Growth-Based Rankings
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Gamification & University Rankings
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Compete based on Growth, not just Grades. Participate in Bug Bounty Challenges and climb the leaderboard.
          </p>
        </div>

        {/* Leaderboard */}
        <div className="max-w-3xl mx-auto bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 px-6 py-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">University Growth Leaderboard</h3>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">Live Rankings</span>
            </div>
          </div>

          <div className="divide-y divide-slate-700/50">
            {[
              { rank: 1, name: 'Priya Sharma', dept: 'CSE', growth: 94, badge: '🏆' },
              { rank: 2, name: 'Rahul Kumar', dept: 'IT', growth: 91, badge: '🥈' },
              { rank: 3, name: 'Ananya Singh', dept: 'CSE', growth: 89, badge: '🥉' },
              { rank: 4, name: 'Vikram Patel', dept: 'ECE', growth: 87, badge: '' },
              { rank: 5, name: 'Sneha Reddy', dept: 'CSE', growth: 85, badge: '' },
            ].map((student) => (
              <div key={student.rank} className={`flex items-center justify-between px-6 py-4 ${student.rank <= 3 ? 'bg-yellow-500/5' : ''}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    student.rank === 1 ? 'bg-yellow-500 text-slate-900' :
                    student.rank === 2 ? 'bg-slate-400 text-slate-900' :
                    student.rank === 3 ? 'bg-amber-600 text-white' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {student.rank}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{student.name}</span>
                      {student.badge && <span>{student.badge}</span>}
                    </div>
                    <span className="text-xs text-slate-400">{student.dept}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-semibold">{student.growth}%</div>
                  <div className="text-xs text-slate-400">Growth Score</div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 bg-slate-900/50 text-center">
            <Link href="/leaderboard" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
              View Full Leaderboard →
            </Link>
          </div>
        </div>

        {/* Bug Bounty CTA */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-2xl px-8 py-6">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-left">
              <h4 className="text-white font-semibold text-lg">Bug Bounty Challenge Active!</h4>
              <p className="text-slate-300 text-sm">Find vulnerabilities in our test environment and earn up to 5,000 points.</p>
            </div>
            <Link 
              href="/bug-bounty"
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              Join Challenge
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// Export all sections
export function FeatureSections() {
  return (
    <>
      <VerifiedRecordSection />
      <HolisticGrowthSection />
      <AISupportSection />
      <CompetitiveArenaSection />
      <GamificationSection />
    </>
  )
}
