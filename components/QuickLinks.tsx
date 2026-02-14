export function QuickLinks() {
  const links = [
    {
      icon: '🔐',
      title: 'Student Portal',
      description: 'Access your grades, courses, and academic information.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: '📝',
      title: 'Course Registration',
      description: 'Register for courses and manage your class schedule.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: '📅',
      title: 'Academic Calendar',
      description: 'View important dates and semester schedules.',
      color: 'from-teal-500 to-teal-600',
    },
    {
      icon: '📚',
      title: 'Library Services',
      description: 'Access online resources and library facilities.',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: '💰',
      title: 'Financial Aid',
      description: 'Manage your tuition and financial assistance.',
      color: 'from-orange-500 to-orange-600',
    },
    {
      icon: '🆘',
      title: 'Student Support',
      description: 'Get help from our student services team.',
      color: 'from-red-500 to-red-600',
    },
  ]

  return (
    <section className="py-20 px-6 bg-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">Quick Links & Services</h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Fast access to essential student services and resources.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {links.map((link, index) => (
            <button
              key={index}
              className={`group relative overflow-hidden rounded-lg p-8 text-left transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95`}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-90 group-hover:opacity-100 transition-opacity`} />

              {/* Content */}
              <div className="relative z-10">
                <div className="text-4xl mb-3">{link.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{link.title}</h3>
                <p className="text-white/90 text-sm leading-relaxed">{link.description}</p>
              </div>

              {/* Hover indicator */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 group-hover:bg-white transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
