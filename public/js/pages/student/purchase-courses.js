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
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
          <div class="h-2 bg-gradient-to-r from-garud-accent via-blue-500 to-garud-highlight"></div>
          <div class="p-6 flex flex-col justify-between h-full">
            <div>
              ${course.image ? `<img src="${course.image}" alt="${escapeHtml(course.name)}" class="w-full h-36 object-cover rounded-lg mb-3 bg-gray-100"/>` : ''}
              <div class="flex items-center gap-2 mb-2">
                ${course.madeFor ? `<span class="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">${course.madeFor.toUpperCase()}</span>` : ''}
                <span class="text-xs text-gray-500">${course.lectureCount || 0} lectures</span>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-1">${escapeHtml(course.name)}</h3>
              ${course.description ? `<p class="text-sm text-gray-500 mb-3">${escapeHtml(course.description)}</p>` : ''}
            </div>
            <div class="mt-4 flex items-center justify-between gap-2">
              <span class="text-xl font-bold text-garud-highlight">Rs ${course.price || 0}</span>
              <div class="flex gap-2">
                ${purchased
                  ? `<a href="/student/course/${course._id}" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-100 transition">View</a>`
                  : `<button data-buy-id="${course._id}" class="btn-buy px-4 py-2 bg-transparent border border-garud-highlight text-garud-highlight rounded-lg text-sm font-semibold hover:bg-gray-100 transition">Buy</button>`}
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
