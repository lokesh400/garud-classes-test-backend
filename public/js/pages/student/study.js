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
        <div class="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col md:flex-row relative group">
          <div class="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-purple-600 hidden md:block"></div>
          <div class="h-1.5 w-full bg-gradient-to-r from-blue-500 to-purple-600 md:hidden"></div>
          ${item.image
            ? `<div class="relative w-full md:w-56 h-48 md:h-auto flex-shrink-0 overflow-hidden">
                 <img src="${item.image}" alt="${item.name || ''}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                 <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                 <div class="absolute bottom-3 left-3 text-white">
                   <span class="text-[10px] font-bold uppercase tracking-wider bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md border border-white/20">${isCourse ? 'COURSE' : 'SERIES'}</span>
                 </div>
               </div>`
            : `<div class="relative w-full md:w-56 h-48 md:h-auto flex-shrink-0 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                 <svg class="w-12 h-12 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                 <div class="absolute bottom-3 left-3">
                   <span class="text-[10px] font-bold uppercase tracking-wider text-white bg-black/20 backdrop-blur-sm px-2 py-1 rounded-md border border-white/20">${isCourse ? 'COURSE' : 'SERIES'}</span>
                 </div>
               </div>`}
          <div class="p-6 flex flex-col justify-between flex-1 relative z-10 md:pl-8">
            <div>
              <div class="flex items-center gap-2 mb-2">
                ${item.madeFor ? `<span class="text-[10px] font-extrabold tracking-wider bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-md uppercase">${item.madeFor}</span>` : ''}
                ${item.tags?.length ? `<span class="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">${item.tags[0]}</span>` : ''}
              </div>
              <h3 class="font-extrabold text-xl text-slate-800 mb-1.5 leading-tight group-hover:text-blue-600 transition-colors duration-300">${item.name || (isCourse ? 'Course' : 'Test Series')}</h3>
              ${item.description ? `<p class="text-sm text-slate-500 mb-2 line-clamp-2">${item.description}</p>` : ''}
            </div>
            <div class="mt-4 flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-gray-100">
              <div class="flex flex-col gap-1 text-xs text-gray-500 font-medium">
                <span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg> ${count} ${countLabel}${count !== 1 ? 's' : ''}</span>
                <span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> Purchased ${new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
              <a href="${openHref}"
                 class="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg hover:opacity-90 transition-all duration-300 text-sm flex items-center gap-2">
                Open ${isCourse ? 'Course' : 'Series'} <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
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
