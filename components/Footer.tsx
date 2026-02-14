import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-950 text-white">
      {/* NEP Alignment Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 py-4">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="font-semibold">Aligned with NEP (National Education Policy) & Outcome-Based Education</span>
          </div>
        </div>
      </div>

      <div className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* About / Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/new_logo_2.png" 
                  alt="Academic Universe" 
                  className="h-12 w-auto"
                />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Academic Universe is the first AI-powered student growth ecosystem. Beyond marks and attendance, we track your holistic development—IQ, EQ, verified achievements, and career readiness.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:bg-emerald-600 hover:text-white transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333H16V2.169c-.585-.089-1.308-.169-2.227-.169-2.995 0-5.207 1.784-5.207 5.014V8z" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:bg-emerald-600 hover:text-white transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-7.655 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:bg-emerald-600 hover:text-white transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:bg-emerald-600 hover:text-white transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Platform */}
            <div>
              <h4 className="font-bold text-lg mb-4 text-white">Platform</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-slate-400 hover:text-emerald-400 transition text-sm">About Us</Link></li>
                <li><Link href="/subscription" className="text-slate-400 hover:text-emerald-400 transition text-sm">Subscription Model</Link></li>
                <li><Link href="/faculty-locator" className="text-slate-400 hover:text-emerald-400 transition text-sm">Faculty Locator</Link></li>
                <li><Link href="/dashboard" className="text-slate-400 hover:text-emerald-400 transition text-sm">Student Dashboard</Link></li>
                <li><Link href="/growth" className="text-slate-400 hover:text-emerald-400 transition text-sm">Growth Analytics</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-bold text-lg mb-4 text-white">Resources</h4>
              <ul className="space-y-3">
                <li><Link href="/research/guidelines" className="text-slate-400 hover:text-emerald-400 transition text-sm">Research Guidelines</Link></li>
                <li><Link href="/mental-health" className="text-slate-400 hover:text-emerald-400 transition text-sm">Mental Health Helplines</Link></li>
                <li><Link href="/api" className="text-slate-400 hover:text-emerald-400 transition text-sm">API Integrations</Link></li>
                <li><Link href="/docs" className="text-slate-400 hover:text-emerald-400 transition text-sm">Documentation</Link></li>
                <li><Link href="/support" className="text-slate-400 hover:text-emerald-400 transition text-sm">Help Center</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-bold text-lg mb-4 text-white">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-slate-400 hover:text-emerald-400 transition text-sm">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-slate-400 hover:text-emerald-400 transition text-sm">Terms of Use</Link></li>
                <li><Link href="/data-protection" className="text-slate-400 hover:text-emerald-400 transition text-sm">Data Protection (IQ/EQ)</Link></li>
                <li><Link href="/cookie-policy" className="text-slate-400 hover:text-emerald-400 transition text-sm">Cookie Policy</Link></li>
                <li><Link href="/compliance" className="text-slate-400 hover:text-emerald-400 transition text-sm">Compliance</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-slate-500 text-sm">
                &copy; {currentYear} Academic Universe by Sharda University. All rights reserved.
              </p>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-slate-500">Powered by</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    AI Engine
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Secure Data
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
