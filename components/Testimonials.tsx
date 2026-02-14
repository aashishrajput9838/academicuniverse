'use client'

import { useState, useEffect } from 'react'

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const testimonials = [
    {
      name: 'Sarah Johnson',
      program: 'Computer Science',
      quote: 'Kingdom Dominion College transformed my academic journey. The faculty and resources provided are exceptional.',
      avatar: '👩‍🎓',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      program: 'Engineering',
      quote: 'The practical experience and internship opportunities at KDC prepared me perfectly for my career.',
      avatar: '👨‍🎓',
      rating: 5,
    },
    {
      name: 'Emily Rodriguez',
      program: 'Business Administration',
      quote: 'The networking opportunities and mentorship here are unmatched. I got my dream job within months of graduation.',
      avatar: '👩‍💼',
      rating: 5,
    },
    {
      name: 'David Kim',
      program: 'Sciences',
      quote: 'Outstanding research facilities and supportive professors made my academic experience truly memorable.',
      avatar: '👨‍🔬',
      rating: 5,
    },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [testimonials.length])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-slate-700 to-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">Student Success Stories</h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Hear from our students about their transformative experiences at Kingdom Dominion College.
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="relative">
          <div className="bg-slate-600 rounded-lg p-12 text-center min-h-[400px] flex flex-col justify-center">
            {/* Avatar */}
            <div className="text-8xl mb-6">{testimonials[currentIndex].avatar}</div>

            {/* Stars */}
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                <span key={i} className="text-3xl text-yellow-400">★</span>
              ))}
            </div>

            {/* Quote */}
            <blockquote className="text-xl text-slate-100 italic mb-8 max-w-3xl mx-auto leading-relaxed">
              "{testimonials[currentIndex].quote}"
            </blockquote>

            {/* Author */}
            <div>
              <p className="text-xl font-bold text-white">{testimonials[currentIndex].name}</p>
              <p className="text-slate-300">{testimonials[currentIndex].program}</p>
            </div>
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center gap-3 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-teal-500 w-8'
                    : 'bg-slate-500 hover:bg-slate-400'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-white hover:text-teal-400 transition"
            aria-label="Previous testimonial"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % testimonials.length)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-white hover:text-teal-400 transition"
            aria-label="Next testimonial"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
