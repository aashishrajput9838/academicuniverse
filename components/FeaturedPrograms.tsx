export function FeaturedPrograms() {
  const programs = [
    {
      icon: '🏗️',
      title: 'Engineering',
      description: 'Cutting-edge engineering programs preparing you for tomorrow\'s innovations.',
    },
    {
      icon: '💼',
      title: 'Business Administration',
      description: 'Develop leadership skills and business acumen for global success.',
    },
    {
      icon: '💻',
      title: 'Computer Science',
      description: 'Master programming and technology in our state-of-the-art facilities.',
    },
    {
      icon: '📚',
      title: 'Liberal Arts',
      description: 'Explore diverse disciplines and develop critical thinking skills.',
    },
    {
      icon: '🔬',
      title: 'Sciences',
      description: 'Conduct research and discover breakthroughs in natural sciences.',
    },
    {
      icon: '🎓',
      title: 'Graduate Programs',
      description: 'Advanced studies for career advancement and specialization.',
    },
  ]

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-slate-700 to-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">Featured Programs</h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Choose from our diverse range of academic programs designed to shape your future and unleash your potential.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {programs.map((program, index) => (
            <div
              key={index}
              className="group bg-slate-600 rounded-lg p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"
            >
              <div className="text-5xl mb-4">{program.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-3">{program.title}</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">{program.description}</p>
              <button className="inline-flex items-center text-teal-400 group-hover:text-teal-300 font-semibold transition">
                Learn More
                <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
