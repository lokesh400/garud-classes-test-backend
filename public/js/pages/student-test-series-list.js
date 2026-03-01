/**
 * pages/student-test-series-list.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  try {
    const list = await API.get('/test-series/published');
    const grid = document.getElementById('series-grid');
    grid.innerHTML = list.map(s => `
      <div class="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition"
           onclick="window.location.href='/student/test-series/${s._id}'">
        <h2 class="text-xl font-semibold text-gray-900">${s.name}</h2>
        <p class="text-gray-500 mt-2 text-sm">${s.description || ''}</p>
        <div class="mt-4 text-sm text-gray-600">${s.price > 0 ? `Price: ₹${s.price}` : 'Free'}</div>
      </div>`).join('') || '<p class="text-gray-400">No test series available.</p>';
  } catch { toast.error('Failed to load test series'); }
  finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('series-grid').classList.remove('hidden');
  }
});
