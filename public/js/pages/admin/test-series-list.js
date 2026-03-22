/**
 * pages/admin-test-series-list.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin');
  if (!user) return;

  // ── Category chip toggle ──────────────────────────────────────────
  document.querySelectorAll('.category-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const span = cb.nextElementSibling;
      if (cb.checked) {
        span.classList.remove('border-gray-300', 'bg-gray-50', 'text-gray-600');
        span.classList.add('border-garud-highlight', 'bg-garud-highlight', 'text-white');
      } else {
        span.classList.remove('border-garud-highlight', 'bg-garud-highlight', 'text-white');
        span.classList.add('border-gray-300', 'bg-gray-50', 'text-gray-600');
      }
    });
  });

  // ── Description bullet points ─────────────────────────────────────
  window.addDescPoint = function(value = '') {
    const container = document.getElementById('desc-points');
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2';
    row.innerHTML = `
      <span class="text-gray-400 font-bold text-lg leading-none">•</span>
      <input type="text" placeholder="Enter a point…" value="${value}"
             class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-garud-accent outline-none"/>
      <button type="button" onclick="this.closest('.flex').remove()"
              class="text-gray-400 hover:text-red-500 transition text-lg leading-none">×</button>`;
    container.appendChild(row);
    row.querySelector('input').focus();
  };

  // ── Banner preview ────────────────────────────────────────────────
  window.previewBanner = function(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img   = document.getElementById('banner-preview');
      const label = document.getElementById('banner-label');
      img.src = e.target.result;
      img.classList.remove('hidden');
      label.textContent = input.files[0].name;
    };
    reader.readAsDataURL(input.files[0]);
  };

  // ── Fetch & render list ───────────────────────────────────────────
  async function fetchSeries() {
    try {
      const list = await API.get('/test-series/admin/all');
      renderList(list);
    } catch { toast.error('Failed to load test series'); }
    finally {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('series-list').classList.remove('hidden');
    }
  }

  function renderList(list) {
    const el = document.getElementById('series-list');
    if (!list.length) {
      el.innerHTML = '<div class="bg-white rounded-xl shadow-md p-12 text-center text-gray-400">No test series yet. Create your first one!</div>';
      return;
    }
    el.innerHTML = list.map(s => {
      const tags = (s.tags || []).map(t =>
        `<span class="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">${t}</span>`
      ).join('');
      const points = s.description
        ? s.description.split('\n').filter(Boolean).map(p =>
            `<li class="text-sm text-gray-500">${p.replace(/^[•\-\*]\s*/, '')}</li>`
          ).join('')
        : '';
      return `
      <div class="bg-white rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row">
        ${s.image ? `<img src="${s.image}" class="w-full md:w-44 h-32 object-cover flex-shrink-0"/>` : ''}
        <div class="flex-1 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-bold text-gray-800 text-lg">${s.name}</h3>
              <span class="px-2 py-0.5 text-xs rounded-full font-medium
                           ${s.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                ${s.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
            ${points ? `<ul class="mt-1 ml-2 list-disc list-inside space-y-0.5">${points}</ul>` : ''}
            <div class="flex items-center gap-2 mt-2 flex-wrap">
              <span class="text-xs font-semibold text-gray-600">₹${s.price || 0}</span>
              <span class="text-gray-300">·</span>
              <span class="text-xs text-gray-400">${s.tests?.length || 0} tests</span>
              ${tags}
            </div>
          </div>
          <div class="flex gap-2 flex-shrink-0 flex-wrap">
            <button onclick="window.location.href='/admin/test-series/${s._id}'"
                    class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">✏ Manage</button>
            <button onclick="togglePublish('${s._id}', ${s.isPublished})"
                    class="px-3 py-2 text-sm ${
                      s.isPublished
                        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    } rounded-lg transition">
              ${s.isPublished ? '🙈 Unpublish' : '🚀 Publish'}
            </button>
            <button onclick="deleteSeries('${s._id}')"
                    class="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">🗑</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // ── UI helpers ────────────────────────────────────────────────────
  window.toggleCreate = function() {
    const wrap = document.getElementById('create-form-wrap');
    wrap.classList.toggle('hidden');
    if (!wrap.classList.contains('hidden')) {
      document.getElementById('series-name').focus();
    }
  };

  window.togglePublish = async function(id, current) {
    try {
      await API.put(`/test-series/${id}`, { isPublished: !current });
      toast.success(current ? 'Series unpublished' : 'Series published!');
      fetchSeries();
    } catch { toast.error('Failed to update'); }
  };

  window.deleteSeries = async function(id) {
    if (!confirm('Delete this test series? This cannot be undone.')) return;
    try {
      await API.delete(`/test-series/${id}`);
      toast.success('Series deleted');
      fetchSeries();
    } catch { toast.error('Failed to delete'); }
  };

  // ── Create form submit ────────────────────────────────────────────
  document.getElementById('create-series-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn     = document.getElementById('create-submit-btn');
    const spinner = document.getElementById('create-spinner');
    btn.disabled  = true;
    spinner.classList.remove('hidden');

    try {
      // 1. Upload banner if chosen
      let imageUrl = '';
      const bannerFile = document.getElementById('banner-file').files[0];
      if (bannerFile) {
        const fd = new FormData();
        fd.append('banner', bannerFile);
        const up = await API.postForm('/test-series/upload-banner', fd);
        imageUrl = up.url;
      }

      // 2. Collect selected tags
      const tags = [...document.querySelectorAll('.category-cb:checked')].map(cb => cb.value);

      // 3. Collect description bullet points
      const points = [...document.querySelectorAll('#desc-points input')]
        .map(i => i.value.trim())
        .filter(Boolean)
        .map(p => `• ${p}`);
      const description = points.join('\n');

      // 4. Create series
      const series = await API.post('/test-series', {
        name:        document.getElementById('series-name').value.trim(),
        description,
        price:       parseFloat(document.getElementById('series-price').value) || 0,
        tags,
        image:       imageUrl,
      });

      toast.success('Series created!');
      window.location.href = `/admin/test-series/${series._id}`;
    } catch (err) {
      toast.error(err.message || 'Failed to create series');
      btn.disabled = false;
      spinner.classList.add('hidden');
    }
  });

  await fetchSeries();
});
