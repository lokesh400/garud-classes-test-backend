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
      el.innerHTML = purchases.map(p => `
        <div class="bg-white rounded shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div class="font-semibold text-lg">${p.testSeries?.name || 'Test Series'}</div>
            <div class="text-sm text-gray-500">${p.testSeries?.description || ''}</div>
            <div class="text-xs text-gray-400 mt-1">Purchased on ${new Date(p.createdAt).toLocaleString()}</div>
          </div>
          <div class="mt-2 md:mt-0 text-right">
            <div class="font-bold text-garud-accent">₹${p.amount}</div>
            <div class="text-xs text-gray-500">${p.method === 'free' ? 'Free' : 'Paid'}</div>
            <div class="text-xs text-gray-500">Status: ${p.status}</div>
          </div>
        </div>`).join('');
    }
  } catch { toast.error('Failed to load purchases'); }
  finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
  }
});
