/**
 * pages/purchase-history.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  try {
    const purchases = await API.get('/purchase/my');
    const el = document.getElementById('main-content');

    if (!purchases.length) {
      el.innerHTML = '<div class="p-8 text-center text-gray-400">No purchases found.</div>';
    } else {
      el.innerHTML = purchases.map(p => {
        const item = p.itemId || {};
        const label = p.itemType === 'TestSeries' ? 'Test Series' : p.itemType;
        return \`
        <div class="bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between relative overflow-hidden group">
          <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-400 to-garud-accent"></div>
          <div class="pl-4">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-[10px] font-extrabold tracking-widest text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100 uppercase">${label}</span>
              <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">${new Date(p.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="font-extrabold text-xl text-slate-800 mb-1 group-hover:text-rose-600 transition-colors">${item.name || 'Unknown Item'}</div>
            <div class="text-sm text-slate-500 line-clamp-1">${item.description || ''}</div>
          </div>
          <div class="mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 md:text-right pl-4 md:pl-0 flex items-center justify-between md:flex-col md:items-end gap-1">
            <div class="flex items-end gap-2">
              <div class="text-xs text-slate-400 font-medium mb-1 hidden md:block">Amount</div>
              <div class="font-black text-2xl text-slate-800">₹${p.amount}</div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">${p.method === 'free' ? 'Free Access' : 'Paid'}</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded ${p.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} uppercase">${p.status}</span>
            </div>
          </div>
        </div>`;
      }).join('');
    }
  } catch { toast.error('Failed to load purchases'); }
  finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
  }
});
