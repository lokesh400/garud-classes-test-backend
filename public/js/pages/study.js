/**
 * pages/study.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  try {
    const all = await API.get('/purchase/my');
    const purchases = all.filter(p => p.testSeries);
    const el = document.getElementById('main-content');

    if (!purchases.length) {
      el.innerHTML = '<div class="p-8 text-center text-gray-400">No purchased test series found.</div>';
    } else {
      el.innerHTML = purchases.map(p => `
        <div class="bg-white rounded shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div class="font-semibold text-lg">${p.testSeries?.name || 'Test Series'}</div>
            <div class="text-sm text-gray-500">${p.testSeries?.description || ''}</div>
            <div class="text-xs text-gray-400 mt-1">Purchased on ${new Date(p.createdAt).toLocaleString()}</div>
          </div>
          <div class="mt-2 md:mt-0 text-right">
            <button onclick="window.location.href='/student/test-series/${p.testSeries?._id}'"
                    class="px-5 py-2 bg-garud-accent text-white rounded-lg font-semibold hover:opacity-90 transition"
                    ${!p.testSeries?._id ? 'disabled' : ''}>
              View Series
            </button>
          </div>
        </div>`).join('');
    }
  } catch { toast.error('Failed to load purchases'); }
  finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
  }
});
