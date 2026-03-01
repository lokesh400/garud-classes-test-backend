/**
 * pages/test-series-manager.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin');
  if (!user) return;

  const seriesId = window.location.pathname.split('/')[3]; // /admin/test-series/:id
  let series = null;
  let allTests = [];

  async function fetchData() {
    try {
      const [s, t] = await Promise.all([
        API.get(`/test-series/admin/${seriesId}`),
        API.get('/tests/admin/all'),
      ]);
      series   = s;
      allTests = t;
      renderSeries();
    } catch {
      toast.error('Failed to load data');
      window.location.href = '/admin/test-series';
    } finally {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('main-content').classList.remove('hidden');
    }
  }

  function renderSeries() {
    document.getElementById('series-name').textContent  = series.name;
    document.getElementById('series-count').textContent = `${series.tests.length} tests in this series`;

    const desc = document.getElementById('series-desc-p');
    if (series.description) { desc.textContent = series.description; desc.classList.remove('hidden'); }

    const badge = document.getElementById('publish-badge');
    badge.textContent = series.isPublished ? 'Published' : 'Draft';
    badge.className   = `px-2 py-0.5 text-xs rounded-full font-medium ${series.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`;

    const btn = document.getElementById('publish-btn');
    btn.textContent = series.isPublished ? 'Unpublish' : 'Publish';
    btn.className   = `px-4 py-2 rounded-lg font-medium transition ${series.isPublished ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`;

    document.getElementById('enrolled-btn').onclick = () =>
      window.location.href = `/admin/test-series/${series._id}/enrolled`;

    // Tests in series
    const el = document.getElementById('tests-in-series');
    if (!series.tests.length) {
      el.innerHTML = '<p class="text-gray-400 text-sm">No tests added yet.</p>';
    } else {
      el.innerHTML = series.tests.map(t => `
        <div class="bg-white rounded-xl shadow-md p-4 flex items-center justify-between">
          <div>
            <p class="font-semibold text-gray-800">${t.name}</p>
            <p class="text-xs text-gray-400">⏱ ${t.duration} min</p>
          </div>
          <button onclick="removeTest('${t._id}')"
                  class="text-red-400 hover:text-red-600 text-sm px-3 py-1 rounded hover:bg-red-50">Remove</button>
        </div>`).join('');
    }

    // All tests picker list
    renderAllTests();
  }

  function renderAllTests() {
    const el = document.getElementById('all-tests-list');
    el.innerHTML = allTests.map(t => {
      const inSeries = series.tests.some(s => s._id === t._id);
      return `
        <div class="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg">
          <div>
            <p class="text-sm font-medium text-gray-800">${t.name}</p>
            <p class="text-xs text-gray-400">⏱ ${t.duration} min</p>
          </div>
          <button onclick="${inSeries ? '' : `addTest('${t._id}')`}"
                  class="text-sm px-3 py-1 rounded-lg ${inSeries
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-garud-highlight text-white hover:opacity-90 transition'}">
            ${inSeries ? '✓ Added' : 'Add'}
          </button>
        </div>`;
    }).join('') || '<p class="text-sm text-gray-400">No tests available.</p>';
  }

  window.togglePublish = async function() {
    try {
      series = await API.put(`/test-series/${seriesId}`, { isPublished: !series.isPublished });
      toast.success(series.isPublished ? 'Series published!' : 'Series unpublished');
      renderSeries();
    } catch { toast.error('Failed to update'); }
  };

  window.togglePicker = function() {
    document.getElementById('picker-panel').classList.toggle('hidden');
  };

  window.addTest = async function(testId) {
    try {
      series = await API.post(`/test-series/${seriesId}/tests`, { testId });
      renderSeries();
      toast.success('Test added to series!');
    } catch (err) { toast.error(err.message || 'Failed to add test'); }
  };

  window.removeTest = async function(testId) {
    try {
      series = await API.delete(`/test-series/${seriesId}/tests/${testId}`);
      renderSeries();
      toast.success('Test removed from series');
    } catch { toast.error('Failed to remove test'); }
  };

  await fetchData();
});
