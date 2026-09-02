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
      <div class="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] cursor-pointer transition-all duration-300 overflow-hidden flex flex-col relative group"
           onclick="window.location.href='/student/test-series/${s._id}'">
        <div class="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        <div class="p-6 relative z-10 flex flex-col h-full">
          ${s.image ? `<img src="${s.image}" alt="${s.name}" class="w-full h-32 object-cover rounded-xl mb-4 shadow-sm"/>` : ''}
          <h2 class="text-xl font-extrabold text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">${s.name}</h2>
          <p class="text-slate-500 mt-1 text-sm line-clamp-3 mb-4 flex-1">${s.description || ''}</p>
          <div class="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
            <span class="text-lg font-black text-slate-800">${s.price > 0 ? `₹${s.price}` : 'Free'}</span>
            <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              View <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
            </span>
          </div>
        </div>
      </div>`).join('') || '<p class="text-gray-400 font-medium">No test series available.</p>';
  } catch { toast.error('Failed to load test series'); }
  finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('series-grid').classList.remove('hidden');
  }
});
