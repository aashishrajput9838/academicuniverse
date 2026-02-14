export function CTASection() {
  return (
    <section className="py-20 px-6 bg-gradient-to-r from-teal-600 to-teal-700">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-5xl font-bold text-white mb-6">Ready to Join Our Community?</h2>
        <p className="text-xl text-teal-100 mb-12 leading-relaxed">
          Take the next step in your academic journey. Apply now and unlock your potential with Kingdom Dominion College.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button className="px-10 py-4 bg-white text-teal-700 rounded-lg font-bold text-lg hover:bg-teal-50 transition hover:scale-105 shadow-lg">
            Apply Now
          </button>
          <button className="px-10 py-4 bg-teal-800 text-white rounded-lg font-bold text-lg hover:bg-teal-900 transition hover:scale-105 border-2 border-white">
            Schedule a Tour
          </button>
          <button className="px-10 py-4 bg-teal-800 text-white rounded-lg font-bold text-lg hover:bg-teal-900 transition hover:scale-105 border-2 border-white">
            Contact Admissions
          </button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur">
            <div className="text-5xl font-bold text-white mb-2">50+</div>
            <p className="text-teal-100">Academic Programs</p>
          </div>
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur">
            <div className="text-5xl font-bold text-white mb-2">15K+</div>
            <p className="text-teal-100">Active Students</p>
          </div>
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur">
            <div className="text-5xl font-bold text-white mb-2">95%</div>
            <p className="text-teal-100">Employment Rate</p>
          </div>
        </div>
      </div>
    </section>
  )
}
