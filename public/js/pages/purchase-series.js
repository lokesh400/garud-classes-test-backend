/**
 * pages/purchase-series.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  let allSeries   = [];
  let purchasedIds = [];
  let filter = 'all';

  async function loadRazorpay() {
    return new Promise(resolve => {
      if (document.getElementById('razorpay-script')) return resolve(true);
      const s = document.createElement('script');
      s.id   = 'razorpay-script';
      s.src  = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload  = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  async function fetchAll() {
    try {
      const [series, purchases] = await Promise.all([
        API.get('/test-series/published'),
        API.get('/purchase/my'),
      ]);
      allSeries    = series;
      purchasedIds = purchases.map(p => p.testSeries?._id);
      renderGrid();
    } catch { toast.error('Failed to load series'); }
    finally {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('series-grid').classList.remove('hidden');
    }
  }

  function renderGrid() {
    const filtered = filter === 'all' ? allSeries : allSeries.filter(s => s.madeFor === filter);
    const grid = document.getElementById('series-grid');
    if (!filtered.length) {
      grid.innerHTML = '<div class="col-span-full bg-white rounded-xl shadow-md p-12 text-center text-gray-400">No test series found for this category.</div>';
      return;
    }
    grid.innerHTML = filtered.map(s => {
      const purchased = purchasedIds.includes(s._id);
      return `
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
          <div class="h-2 bg-gradient-to-r from-garud-accent via-purple-500 to-garud-highlight"></div>
          <div class="p-6 flex flex-col justify-between h-full">
            <div>
              ${s.image ? `<img src="${s.image}" alt="${s.name}" class="w-full h-36 object-cover rounded-lg mb-3 bg-gray-100"/>` : ''}
              <div class="flex items-center gap-2 mb-2">
                ${s.madeFor ? `<span class="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">${s.madeFor.toUpperCase()}</span>` : ''}
                ${s.tags?.length ? `<span class="text-xs text-gray-500">${s.tags.join(', ')}</span>` : ''}
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-1">${s.name}</h3>
              ${s.description ? `<p class="text-sm text-gray-500 mb-3">${s.description}</p>` : ''}
            </div>
            <div class="mt-4 flex items-center justify-between">
              <span class="text-xl font-bold text-garud-highlight">₹${s.price || 0}</span>
              ${purchased
                ? `<span class="px-5 py-2 bg-green-500 text-white rounded-lg font-semibold">Purchased</span>`
                : `<button onclick="handleBuy('${s._id}', ${s.price || 0}, '${s.name.replace(/'/g,"\\'")}', '${(s.description||'').replace(/'/g,"\\'")}', '${s.currency||'INR'}')"
                          class="px-5 py-2 bg-transparent border border-garud-highlight text-garud-highlight rounded-lg font-semibold hover:bg-gray-100 transition">
                    Buy Now
                  </button>`}
            </div>
          </div>
        </div>`;
    }).join('');
  }

  document.getElementById('category-filter').addEventListener('change', (e) => {
    filter = e.target.value;
    renderGrid();
  });

  window.handleBuy = async function(seriesId, price, name, description, currency) {
    if (price > 0) {
      const ok = await loadRazorpay();
      if (!ok) return toast.error('Failed to load payment gateway');
      try {
        const data = await API.post('/payments/create-order', { seriesId });
        const options = {
          key:         data.razorpayKeyId || '',
          amount:      data.amount,
          currency:    data.currency || currency,
          name,
          description,
          order_id:    data.orderId,
          handler: async (response) => {
            await API.post('/payments/verify', { seriesId, paymentId: response.razorpay_payment_id });
            toast.success('Payment successful! Access granted.');
            // refetch
            const purchases = await API.get('/purchase/my');
            purchasedIds = purchases.map(p => p.testSeries?._id);
            renderGrid();
          },
          prefill: { name: user.name, email: user.email },
          theme: { color: '#e94560' },
        };
        new window.Razorpay(options).open();
      } catch (err) { toast.error(err.message || 'Payment failed'); }
    } else {
      try {
        await API.post('/payments/free-access', { seriesId });
        toast.success('Enrolled successfully!');
        const purchases = await API.get('/purchase/my');
        purchasedIds = purchases.map(p => p.testSeries?._id);
        renderGrid();
      } catch (err) { toast.error(err.message || 'Failed to enroll'); }
    }
  };

  await fetchAll();
});
