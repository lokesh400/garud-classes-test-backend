/**
 * pages/purchase-series.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  let allSeries    = [];
  let purchasedIds = [];
  let filter       = 'all';
  let searchQuery  = '';
  let sortMode     = 'latest';
  const seriesMap  = new Map(); // id → series object, avoids JSON-in-HTML issues

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeUrl(url) {
    const value = String(url || '').trim();
    if (!value) return '';
    if (value.startsWith('/')) return value;
    if (/^https?:\/\//i.test(value)) return value;
    return '';
  }

  function updateStats(filteredCount) {
    const seriesCountEl = document.getElementById('series-count');
    const purchasedCountEl = document.getElementById('purchased-count');
    const activeCategoryEl = document.getElementById('active-category-label');

    if (seriesCountEl) {
      seriesCountEl.textContent = String(filteredCount);
    }

    if (purchasedCountEl) {
      purchasedCountEl.textContent = String(purchasedIds.length);
    }

    if (activeCategoryEl) {
      const label = filter === 'all' ? 'All' : filter.toUpperCase();
      activeCategoryEl.textContent = label;
    }
  }

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
        API.get('/purchase/my?itemType=TestSeries'),
      ]);
      allSeries    = series;
      seriesMap.clear();
      allSeries.forEach(s => seriesMap.set(s._id, s));
      purchasedIds = purchases.map(p => p.itemId?._id);
      renderGrid();
    } catch { toast.error('Failed to load series'); }
    finally {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('series-grid').classList.remove('hidden');
    }
  }

  function renderGrid() {
    const byCategory = filter === 'all' ? allSeries : allSeries.filter(s => s.madeFor === filter);
    const bySearch = byCategory.filter((s) => {
      if (!searchQuery) return true;
      const hay = `${s.name || ''} ${s.description || ''} ${(s.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(searchQuery);
    });

    const filtered = [...bySearch].sort((a, b) => {
      if (sortMode === 'price-low') {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      if (sortMode === 'price-high') {
        return Number(b.price || 0) - Number(a.price || 0);
      }
      if (sortMode === 'name') {
        return String(a.name || '').localeCompare(String(b.name || ''));
      }
      // latest
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    updateStats(filtered.length);
    const grid = document.getElementById('series-grid');
    if (!filtered.length) {
      grid.innerHTML = '<div class="col-span-full bg-white rounded-2xl border border-slate-200 p-14 text-center text-slate-500 text-base font-medium">No test series found for your current filters.</div>';
      return;
    }
    grid.innerHTML = filtered.map(s => {
      const purchased = purchasedIds.includes(s._id);
      const safeName = escapeHtml(s.name || 'Untitled Series');
      const safeDesc = escapeHtml(s.description || '');
      const imageUrl = sanitizeUrl(s.image);
      const madeFor = escapeHtml((s.madeFor || '').toUpperCase());
      const tags = Array.isArray(s.tags) ? s.tags.map((tag) => escapeHtml(tag)).join(', ') : '';
      const price = Number(s.price || 0);
      return `
        <article class="bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col relative group h-full">
          <div class="absolute inset-0 bg-gradient-to-br from-garud-accent/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-cyan-500"></div>
          <div class="p-5 md:p-6 flex flex-col justify-between h-full relative z-10">
            <div>
              ${imageUrl ? `<img src="${imageUrl}" alt="${safeName}" class="w-full h-40 object-cover rounded-xl mb-4 shadow-sm group-hover:shadow-md transition-shadow duration-300"/>` : '<div class="w-full h-40 rounded-xl mb-4 bg-gradient-to-br from-orange-100 to-cyan-100 flex items-center justify-center text-orange-300"><svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>'}
              <div class="flex flex-wrap items-center gap-2 mb-3">
                ${madeFor ? `<span class="text-[10px] font-extrabold tracking-wider bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-md uppercase">${madeFor}</span>` : ''}
                ${tags ? `<span class="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">${tags}</span>` : ''}
              </div>
              <h3 class="text-xl font-extrabold text-slate-800 mb-2 leading-tight group-hover:text-orange-500 transition-colors duration-300">${safeName}</h3>
              ${safeDesc ? `<p class="text-sm text-slate-500 mb-4 line-clamp-2">${safeDesc}</p>` : ''}
            </div>
            <div class="mt-2 flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <div class="flex flex-col">
                <span class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Price</span>
                <span class="text-2xl font-black text-slate-800">₹${price}</span>
              </div>
              ${purchased
                ? `<span class="px-5 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-sm font-bold flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Purchased</span>`
                : `<button data-buy-id="${s._id}"
                          class="btn-buy px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:opacity-90 transition-all duration-300">
                    Buy Now
                  </button>`}
            </div>
          </div>
        </article>`;
    }).join('');
  }

  document.getElementById('category-filter').addEventListener('change', (e) => {
    filter = e.target.value;
    renderGrid();
  });

  const seriesSearchEl = document.getElementById('series-search');
  if (seriesSearchEl) {
    seriesSearchEl.addEventListener('input', (e) => {
      searchQuery = String(e.target?.value || '').trim().toLowerCase();
      renderGrid();
    });
  }

  const sortFilterEl = document.getElementById('sort-filter');
  if (sortFilterEl) {
    sortFilterEl.addEventListener('change', (e) => {
      sortMode = e.target.value || 'latest';
      renderGrid();
    });
  }

  // Use event delegation — avoids broken inline onclick when name/description
  // contain quotes, newlines or other special characters
  document.getElementById('series-grid').addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-buy');
    if (!btn) return;
    const seriesId = btn.dataset.buyId;
    const s = seriesMap.get(seriesId);
    if (!s) return;
    await handleBuy(seriesId, s.price || 0, s.name, s.description || '', 'INR');
  });

  async function handleBuy(seriesId, price, name, description, currency) {
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
            try {
              await API.post('/payments/verify', {
                seriesId,
                paymentId:  response.razorpay_payment_id,
                orderId:    response.razorpay_order_id,
                signature:  response.razorpay_signature,
              });
              toast.success('Payment successful! Access granted.');
              const purchases = await API.get('/purchase/my?itemType=TestSeries');
              purchasedIds = purchases.map(p => p.itemId?._id);
              renderGrid();
            } catch (err) { toast.error(err.message || 'Payment verification failed'); }
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
        const purchases = await API.get('/purchase/my?itemType=TestSeries');
        purchasedIds = purchases.map(p => p.itemId?._id);
        renderGrid();
      } catch (err) { toast.error(err.message || 'Failed to enroll'); }
    }
  }

  await fetchAll();
});
