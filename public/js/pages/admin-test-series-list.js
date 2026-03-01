/**
 * pages/admin-test-series-list.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin');
  if (!user) return;

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
      el.innerHTML = '<div class="bg-white rounded-xl shadow-md p-12 text-center text-gray-400">No test series yet.</div>';
      return;
    }
    el.innerHTML = list.map(s => `
      <div class="bg-white rounded-xl shadow-md p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div class="flex items-center gap-3">
            <h3 class="font-bold text-gray-800">${s.name}</h3>
            <span class="px-2 py-0.5 text-xs rounded-full font-medium
                         ${s.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
              ${s.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
          ${s.description ? `<p class="text-sm text-gray-500 mt-1">${s.description}</p>` : ''}
          <p class="text-xs text-gray-400 mt-1">₹${s.price || 0} · ${s.tests?.length || 0} tests</p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button onclick="window.location.href='/admin/test-series/${s._id}'"
                  class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">✏ Manage</button>
          <button onclick="togglePublish('${s._id}', ${s.isPublished})"
                  class="px-3 py-2 text-sm ${s.isPublished ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'} rounded-lg transition">
            ${s.isPublished ? '🙈 Unpublish' : '🚀 Publish'}
          </button>
          <button onclick="deleteSeries('${s._id}')"
                  class="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">🗑</button>
        </div>
      </div>`).join('');
  }

  window.toggleCreate = function() {
    document.getElementById('create-form-wrap').classList.toggle('hidden');
  };

  window.togglePublish = async function(id, current) {
    try {
      await API.put(`/test-series/${id}`, { isPublished: !current });
      toast.success(current ? 'Series unpublished' : 'Series published!');
      fetchSeries();
    } catch { toast.error('Failed to update'); }
  };

  window.deleteSeries = async function(id) {
    if (!confirm('Delete this test series?')) return;
    try {
      await API.delete(`/test-series/${id}`);
      toast.success('Series deleted');
      fetchSeries();
    } catch { toast.error('Failed to delete'); }
  };

  document.getElementById('create-series-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const series = await API.post('/test-series', {
        name:        document.getElementById('series-name').value.trim(),
        description: document.getElementById('series-desc').value.trim(),
        price:       parseFloat(document.getElementById('series-price').value) || 0,
      });
      toast.success('Series created!');
      window.location.href = `/admin/test-series/${series._id}`;
    } catch (err) { toast.error(err.message || 'Failed to create'); }
  });

  await fetchSeries();
});
