/**
 * pages/study.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  try {
    const purchases = await API.get('/purchase/my');
    const el = document.getElementById('main-content');

    if (!purchases.length) {
      el.innerHTML = `
        <div class="bg-white rounded-xl shadow p-12 text-center text-gray-400">
          <div class="text-5xl mb-4">📚</div>
          <div class="text-lg font-semibold mb-1">No purchased content yet</div>
          <div class="text-sm mb-4">Browse and purchase a test series or course to start studying.</div>
          <a href="/student/purchase-courses"
             class="inline-block px-6 py-2 bg-garud-highlight text-white rounded-lg font-semibold hover:opacity-90 transition">
            Browse Courses
          </a>
        </div>`;
    } else {
      el.innerHTML = purchases.map(p => {
        const item = p.itemId || {};
        const isCourse = p.itemType === 'Course';
        const count = isCourse ? (item.lectures?.length ?? 0) : (item.tests?.length ?? 0);
        const countLabel = isCourse ? 'lecture' : 'test';
        const openHref = isCourse ? `/student/course/${item._id}` : `/student/test-series/${item._id}`;
        return `
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition flex flex-col md:flex-row">
          ${item.image
            ? `<img src="${item.image}" alt="${item.name || ''}"
                    class="w-full md:w-40 h-36 md:h-auto object-cover flex-shrink-0"/>`
            : `<div class="w-full md:w-40 h-2 md:h-auto bg-gradient-to-b from-garud-accent to-garud-highlight flex-shrink-0"></div>`}
          <div class="p-5 flex flex-col justify-between flex-1">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold px-2 py-0.5 rounded ${isCourse ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">${isCourse ? 'COURSE' : 'SERIES'}</span>
                ${item.madeFor ? `<span class="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">${item.madeFor.toUpperCase()}</span>` : ''}
                ${item.tags?.length ? `<span class="text-xs text-gray-400">${item.tags.join(', ')}</span>` : ''}
              </div>
              <div class="font-bold text-lg text-gray-900">${item.name || (isCourse ? 'Course' : 'Test Series')}</div>
              ${item.description ? `<div class="text-sm text-gray-500 mt-1">${item.description}</div>` : ''}
            </div>
            <div class="mt-4 flex items-center justify-between flex-wrap gap-2">
              <div class="text-xs text-gray-400">
                ${count} ${countLabel}${count !== 1 ? 's' : ''} &nbsp;·&nbsp;
                Purchased on ${new Date(p.createdAt).toLocaleDateString()}
              </div>
              <a href="${openHref}"
                 class="px-5 py-2 bg-garud-accent text-white rounded-lg font-semibold hover:opacity-90 transition text-sm">
                Open →
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
