/**
 * pages/test-series-view.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  const seriesId = window.location.pathname.split('/')[3]; // /student/test-series/:id
  let series    = null;
  let purchased = false;

  async function loadRazorpay() {
    return new Promise(resolve => {
      if (document.getElementById('razorpay-script')) return resolve(true);
      const s = document.createElement('script');
      s.id      = 'razorpay-script';
      s.src     = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload  = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  async function fetchData() {
    try {
      const [s, pRes] = await Promise.all([
        API.get(`/test-series/published/${seriesId}`),
        API.get(`/purchase/check?itemType=TestSeries&itemId=${seriesId}`),
      ]);
      series    = s;
      purchased = !!pRes.purchased;
      render();
    } catch {
      toast.error('Failed to load test series');
      window.location.href = '/student/purchase-series';
    } finally {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('main-content').classList.remove('hidden');
    }
  }

  function render() {
    const price = series.price || 0;

    document.getElementById('series-name').textContent = series.name;
    const desc = document.getElementById('series-desc');
    if (series.description) { desc.textContent = series.description; desc.classList.remove('hidden'); }

    // Purchase actions
    const actions = document.getElementById('purchase-actions');
    if (purchased && price > 0) {
      actions.innerHTML = `<span class="px-6 py-2 bg-green-500 text-white rounded-lg font-semibold inline-block">Purchased</span>`;
    } else if (!purchased && price > 0) {
      actions.innerHTML = `
        <button onclick="handlePurchase()"
                class="mt-1 px-6 py-2 bg-transparent border border-garud-highlight text-garud-highlight rounded-lg font-semibold hover:bg-gray-100 transition">
          Purchase Series ₹${price}
        </button>`;
    } else if (!purchased && price === 0) {
      actions.innerHTML = `
        <button onclick="handleFreeAccess()"
                class="mt-1 px-6 py-2 bg-garud-accent text-white rounded-lg font-semibold hover:opacity-90 transition">
          Claim Free Access
        </button>`;
    }

    // Progress
    const total    = series.tests.length;
    const submitted = series.tests.filter(t => t.isSubmitted).length;
    const pct       = total > 0 ? Math.round((submitted / total) * 100) : 0;
    document.getElementById('progress-text').textContent = `${submitted} / ${total} completed`;
    document.getElementById('progress-bar').style.width  = `${pct}%`;

    // Tests
    const listEl = document.getElementById('tests-list');
    listEl.innerHTML = series.tests.map((t, i) => {
      const canAttempt  = purchased || price === 0;
      const isSubmitted = t.isSubmitted;
      return `
        <div class="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm
                        ${isSubmitted ? 'bg-green-500' : 'bg-gray-200 text-gray-600'}">
              ${i + 1}
            </div>
            <div>
              <p class="font-semibold text-gray-800">${t.name}</p>
              <p class="text-xs text-gray-400">⏱ ${t.duration} min · ${t.sections?.reduce((a,s)=>a+s.questions.length,0)||0} questions</p>
            </div>
          </div>
          <div>
            ${isSubmitted
              ? `<button onclick="window.location.href='/student/results/${t._id}'"
                        class="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition">
                  View Results
                </button>`
              : canAttempt
                ? `<button onclick="window.location.href='/student/test/${t._id}'"
                          class="px-4 py-2 bg-garud-highlight text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
                    ▶ Start
                  </button>`
                : `<span class="text-sm text-gray-400">🔒 Locked</span>`}
          </div>
        </div>`;
    }).join('') || '<p class="text-gray-400 text-sm">No tests in this series.</p>';
  }

  window.handlePurchase = async function() {
    const ok = await loadRazorpay();
    if (!ok) return toast.error('Failed to load payment gateway');
    try {
      const data = await API.post('/payments/create-order', { seriesId });
      const options = {
        key:      data.razorpayKeyId || '',
        amount:   data.amount,
        currency: data.currency || 'INR',
        name:     series.name,
        description: series.description,
        order_id: data.orderId,
        handler: async (resp) => {
          await API.post('/payments/verify', { seriesId, paymentId: resp.razorpay_payment_id });
          toast.success('Payment successful! Access granted.');
          const pRes = await API.get(`/purchase/series/${seriesId}`);
          purchased = !!pRes.purchased;
          render();
        },
        prefill: { name: user.name, email: user.email },
        theme: { color: '#e94560' },
      };
      new window.Razorpay(options).open();
    } catch (err) { toast.error(err.message || 'Payment failed'); }
  };

  window.handleFreeAccess = async function() {
    try {
      await API.post('/payments/free-access', { seriesId });
      toast.success('Access granted!');
      const pRes = await API.get(`/purchase/series/${seriesId}`);
      purchased = !!pRes.purchased;
      render();
    } catch (err) { toast.error(err.message || 'Failed to claim free access'); }
  };

  await fetchData();
});
