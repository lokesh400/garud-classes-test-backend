document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  let allCourses = [];
  let purchasedIds = [];
  let filter = 'all';

  async function loadRazorpay() {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-script')) return resolve(true);
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function fetchAll() {
    try {
      const [courses, purchases] = await Promise.all([
        API.get('/courses/published?fields=basic'),
        API.get('/purchase/my?itemType=Course'),
      ]);
      allCourses = courses;
      purchasedIds = purchases.map((purchase) => purchase.itemId?._id);
      renderGrid();
    } catch (error) {
      toast.error(error.message || 'Failed to load courses');
    } finally {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('courses-grid').classList.remove('hidden');
    }
  }

  function renderGrid() {
    const list = filter === 'all' ? allCourses : allCourses.filter((course) => course.madeFor === filter);
    const grid = document.getElementById('courses-grid');

    if (!list.length) {
      grid.innerHTML = '<div class="col-span-full bg-white rounded-xl shadow-md p-12 text-center text-gray-400">No courses found for this category.</div>';
      return;
    }

    grid.innerHTML = list.map((course) => {
      const purchased = purchasedIds.includes(course._id);
      return `
        <div class="bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col relative group">
          <div class="absolute inset-0 bg-gradient-to-br from-garud-accent/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="h-1.5 w-full bg-gradient-to-r from-garud-accent via-purple-500 to-blue-500"></div>
          <div class="p-6 flex flex-col justify-between h-full relative z-10">
            <div>
              ${course.image ? `<img src="${course.image}" alt="${escapeHtml(course.name)}" class="w-full h-40 object-cover rounded-xl mb-4 shadow-sm group-hover:shadow-md transition-shadow duration-300"/>` : `<div class="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 flex items-center justify-center text-gray-400"><svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`}
              <div class="flex items-center gap-2 mb-3">
                ${course.madeFor ? `<span class="text-[10px] font-extrabold tracking-wider bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-md uppercase">${course.madeFor}</span>` : ''}
                <span class="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">${course.lectureCount || 0} lectures</span>
              </div>
              <h3 class="text-xl font-extrabold text-slate-800 mb-2 leading-tight group-hover:text-garud-accent transition-colors duration-300">${escapeHtml(course.name)}</h3>
              ${course.description ? `<p class="text-sm text-slate-500 mb-4 line-clamp-2">${escapeHtml(course.description)}</p>` : ''}
            </div>
            <div class="mt-2 flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <div class="flex flex-col">
                <span class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Price</span>
                <span class="text-2xl font-black text-slate-800">₹${course.price || 0}</span>
              </div>
              <div class="flex gap-2">
                ${purchased
                  ? `<a href="/student/course/${course._id}" class="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-700 hover:shadow-lg transition-all duration-300 flex items-center gap-2">View Course <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></a>`
                  : `<button data-buy-id="${course._id}" class="btn-buy px-6 py-2.5 bg-gradient-to-r from-garud-accent to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:opacity-90 transition-all duration-300">Enroll Now</button>`}
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  async function purchaseCourse(course) {
    if ((course.price || 0) > 0) {
      const ok = await loadRazorpay();
      if (!ok) return toast.error('Failed to load payment gateway');

      try {
        const order = await API.post('/payments/create-order', { itemType: 'Course', itemId: course._id });
        const options = {
          key: order.razorpayKeyId || '',
          amount: order.amount,
          currency: order.currency || 'INR',
          name: course.name,
          description: course.description || 'Course purchase',
          order_id: order.orderId,
          handler: async (response) => {
            await API.post('/payments/verify', {
              itemType: 'Course',
              itemId: course._id,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });
            toast.success('Course purchased successfully');
            await fetchAll();
          },
          prefill: { name: user.name, email: user.email },
          theme: { color: '#e94560' },
        };
        new window.Razorpay(options).open();
      } catch (error) {
        toast.error(error.message || 'Payment failed');
      }
      return;
    }

    try {
      await API.post('/payments/free-access', { itemType: 'Course', itemId: course._id });
      toast.success('Course enrolled successfully');
      await fetchAll();
    } catch (error) {
      toast.error(error.message || 'Failed to enroll course');
    }
  }

  document.getElementById('category-filter').addEventListener('change', (event) => {
    filter = event.target.value;
    renderGrid();
  });

  document.getElementById('courses-grid').addEventListener('click', async (event) => {
    const button = event.target.closest('.btn-buy');
    if (!button) return;
    const course = allCourses.find((item) => item._id === button.dataset.buyId);
    if (!course) return;
    await purchaseCourse(course);
  });

  await fetchAll();
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
