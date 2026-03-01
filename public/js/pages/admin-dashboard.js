/**
 * pages/admin-dashboard.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin')
  if (!user) return

  try {
    const [subjects, questions, tests] = await Promise.all([
      API.get('/subjects'),
      API.get('/questions'),
      API.get('/tests/admin/all')
    ])

    const stats = [
      {
        label: 'Subjects',
        value: subjects.length,
        bg: 'bg-blue-500',
        icon: iconSubject()
      },
      {
        label: 'Questions',
        value: questions.length,
        bg: 'bg-green-500',
        icon: iconQ()
      },
      {
        label: 'Total Tests',
        value: tests.length,
        bg: 'bg-purple-500',
        icon: iconClip()
      },
      {
        label: 'Published Tests',
        value: tests.filter(t => t.isPublished).length,
        bg: 'bg-orange-500',
        icon: iconUsers()
      }
    ]

    document.getElementById('stat-cards').innerHTML = stats
      .map(
        s => `
      <div class="bg-white rounded-xl shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">${s.label}</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">${s.value}</p>
          </div>
          <div class="${s.bg} p-3 rounded-lg text-white">${s.icon}</div>
        </div>
      </div>`
      )
      .join('')
  } catch (err) {
    toast.error('Failed to load dashboard data')
  } finally {
    document.getElementById('loading').classList.add('hidden')
    document.getElementById('main-content').classList.remove('hidden')
  }
})

function iconSubject () {
  return svg(
    'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
  )
}
function iconQ () {
  return svg(
    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  )
}
function iconClip () {
  return svg(
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
  )
}
function iconUsers () {
  return svg(
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'
  )
}
function svg (d) {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`
}
