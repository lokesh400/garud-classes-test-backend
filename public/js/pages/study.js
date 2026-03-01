/**
 * pages/study.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  try {
    const purchases = await API.get('/purchase/my?itemType=TestSeries');
    const el = document.getElementById('main-content');

    if (!purchases.length) {
      el.innerHTML = `
        <div class="bg-white rounded-xl shadow p-12 text-center text-gray-400">
          <div class="text-5xl mb-4">📚</div>
          <div class="text-lg font-semibold mb-1">No purchased series yet</div>
          <div class="text-sm mb-4">Browse and purchase a test series to start studying.</div>
          <a href="/student/purchase-series"
             class="inline-block px-6 py-2 bg-garud-highlight text-white rounded-lg font-semibold hover:opacity-90 transition">
            Browse Series
          </a>
        </div>`;
    } else {
      el.innerHTML = purchases.map(p => {
        const s = p.itemId || {};
        const testCount = s.tests?.length ?? 0;
        return `
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition flex flex-col md:flex-row">
          ${s.image
            ? `<img src="${s.image}" alt="${s.name || ''}"
                    class="w-full md:w-40 h-36 md:h-auto object-cover flex-shrink-0"/>`
            : `<div class="w-full md:w-40 h-2 md:h-auto bg-gradient-to-b from-garud-accent to-garud-highlight flex-shrink-0"></div>`}
          <div class="p-5 flex flex-col justify-between flex-1">
            <div>
              <div class="flex items-center gap-2 mb-1">
                ${s.madeFor ? `<span class="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">${s.madeFor.toUpperCase()}</span>` : ''}
                ${s.tags?.length ? `<span class="text-xs text-gray-400">${s.tags.join(', ')}</span>` : ''}
              </div>
              <div class="font-bold text-lg text-gray-900">${s.name || 'Test Series'}</div>
              ${s.description ? `<div class="text-sm text-gray-500 mt-1">${s.description}</div>` : ''}
            </div>
            <div class="mt-4 flex items-center justify-between flex-wrap gap-2">
              <div class="text-xs text-gray-400">
                ${testCount} test${testCount !== 1 ? 's' : ''} &nbsp;·&nbsp;
                Purchased on ${new Date(p.createdAt).toLocaleDateString()}
              </div>
              <a href="/student/test-series/${s._id}"
                 class="px-5 py-2 bg-garud-accent text-white rounded-lg font-semibold hover:opacity-90 transition text-sm">
                Study →
              </a>
            </div>
          </div>
        </div>`;
      }).join('');
    }
  } catch (err) { toast.error('Failed to load purchases'); }
  finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
  }
});
