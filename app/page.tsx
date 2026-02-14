'use client'

import { useEffect, useRef } from 'react'
import { Navbar } from '@/components/Navbar'
import { HeroSection } from '@/components/HeroSection'
import { FeatureSections } from '@/components/FeatureSections'
import { Footer } from '@/components/Footer'

export default function AcademicUniverseHome() {
  const scrollerRef = useRef<HTMLDivElement>(null)

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

      {/* Hero Section */}
      <HeroSection />

      {/* Feature Sections */}
      <FeatureSections />

      {/* Footer */}
      <Footer />

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
