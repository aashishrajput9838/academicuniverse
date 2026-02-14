export function Announcements() {
  const announcements = [
    {
      date: 'Jan 28, 2025',
      title: 'Spring Semester Classes Begin',
      description: 'All spring semester classes commence on this date. Please ensure course registration is complete.',
      icon: '📢',
      type: 'important',
    },
    {
      date: 'Feb 14, 2025',
      title: 'Career Fair 2025',
      description: 'Join us for our annual career fair featuring top employers. Network with industry professionals.',
      icon: '💼',
      type: 'event',
    },
    {
      date: 'Mar 10, 2025',
      title: 'Scholarship Applications Open',
      description: 'New scholarship opportunities are now available. Applications close March 31, 2025.',
      icon: '🏆',
      type: 'opportunity',
    },
    {
      date: 'Apr 5, 2025',
      title: 'Campus Maintenance Schedule',
      description: 'Scheduled maintenance on student facilities. Check email for specific building closures.',
      icon: '🔧',
      type: 'notice',
    },
  ]

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'important':
        return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20'
      case 'event':
        return 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case 'opportunity':
        return 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20'
      default:
        return 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
    }
  }

  return (
    <section className="py-20 px-6 bg-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">Latest Announcements</h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Stay updated with the latest news and important announcements from Kingdom Dominion College.
          </p>
        </div>

        <div className="space-y-6">
          {announcements.map((announcement, index) => (
            <div
              key={index}
              className={`rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:scale-102 ${getTypeColor(
                announcement.type
              )}`}
            >
              <div className="flex gap-4">
                <div className="text-4xl flex-shrink-0">{announcement.icon}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">
                        {announcement.date}
                      </p>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        {announcement.title}
                      </h3>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {announcement.description}
                      </p>
                    </div>
                    <button className="flex-shrink-0 px-6 py-2 bg-teal-600 text-white rounded font-semibold hover:bg-teal-700 transition">
                      Read More
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="px-8 py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition hover:scale-105">
            View All Announcements
          </button>
        </div>
      </div>
    </section>
  )
}
