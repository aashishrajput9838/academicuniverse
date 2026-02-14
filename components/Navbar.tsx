'use client'

import { useState } from 'react'
import Link from 'next/link'

interface DropdownItem {
  label: string
  href: string
}

interface NavItem {
  label: string
  href?: string
  dropdown?: DropdownItem[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    dropdown: [
      { label: 'Student View', href: '/dashboard/student' },
      { label: 'Faculty View', href: '/dashboard/faculty' },
    ]
  },
  {
    label: 'Growth Hub',
    dropdown: [
      { label: 'IQ/EQ Trends', href: '/growth/trends' },
      { label: 'Growth Degradation Analysis', href: '/growth/analysis' },
    ]
  },
  {
    label: 'Career & Verified Profile',
    dropdown: [
      { label: 'Centralized Presence', href: '/career/profile' },
      { label: 'Certifications', href: '/career/certifications' },
    ]
  },
  {
    label: 'AI Chatbot',
    href: '/chatbot',
  },
  {
    label: 'Research Wing',
    href: '/research',
  },
  {
    label: 'Code Arena',
    href: '/code-arena',
  },
]

export function Navbar() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <img 
            src="/new_logo_2.png"
            alt="Sharda University - Beyond Boundaries" 
            className="h-14 w-auto"
          />
        </Link>

        {/* Navigation Items */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.dropdown && setActiveDropdown(item.label)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              {item.dropdown ? (
                <button className="text-slate-200 font-medium px-4 py-2 rounded-lg hover:bg-slate-700/50 transition flex items-center gap-1">
                  {item.label}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : (
                <Link 
                  href={item.href || '#'}
                  className="text-slate-200 font-medium px-4 py-2 rounded-lg hover:bg-slate-700/50 transition flex items-center gap-1"
                >
                  {item.label === 'AI Chatbot' && (
                    <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full mr-1">
                      Emotional Support
                    </span>
                  )}
                  {item.label}
                </Link>
              )}

              {/* Dropdown Menu */}
              {item.dropdown && activeDropdown === item.label && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
                  {item.dropdown.map((subItem) => (
                    <Link
                      key={subItem.label}
                      href={subItem.href}
                      className="block px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                    >
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Search & Auth Buttons */}
        <div className="flex items-center gap-4">
          {/* Faculty Cabin Finder Search */}
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Find Faculty Cabin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 px-4 py-2 pl-10 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Auth Buttons */}
          <Link 
            href="/login/faculty"
            className="text-slate-300 font-medium px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition"
          >
            Faculty Login
          </Link>
          <Link 
            href="/login/student"
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition shadow-lg shadow-emerald-500/25"
          >
            Student Login / Get Started
          </Link>
        </div>
      </div>
    </nav>
  )
}
