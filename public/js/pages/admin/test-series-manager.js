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
      el.innerHTML = series.tests.map(t => {
        const totalQ    = t.sections ? t.sections.reduce((sum, s) => sum + s.questions.length, 0) : 0;
        const isPractice = t.mode === 'practice';
        const modeLabel  = isPractice ? '🔁 Practice' : '🎯 Real';
        const modeColor  = isPractice ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';
        const pubColor   = t.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
        const pubLabel   = t.isPublished ? 'Published' : 'Draft';
        const schedText  = t.scheduledAt
          ? '📅 ' + new Date(t.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
          : '';
        const syllabusHTML = t.syllabus
          ? `<details class="mt-2"><summary class="text-xs text-garud-accent cursor-pointer font-medium select-none">📋 View Syllabus</summary><p class="text-xs text-gray-600 mt-1 whitespace-pre-wrap pl-2 border-l-2 border-garud-accent/30">${t.syllabus}</p></details>`
          : '';
        return `
        <div class="bg-white rounded-xl shadow-md p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <p class="font-semibold text-gray-800">${t.name}</p>
                <span class="px-1.5 py-0.5 text-xs rounded-full font-medium ${modeColor}">${modeLabel}</span>
                <span class="px-1.5 py-0.5 text-xs rounded-full font-medium ${pubColor}">${pubLabel}</span>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>⏱ ${t.duration} min</span>
                <span>📝 ${totalQ} question${totalQ !== 1 ? 's' : ''}</span>
                <span>📂 ${t.sections ? t.sections.length : 0} section${(t.sections || []).length !== 1 ? 's' : ''}</span>
                ${schedText ? `<span>${schedText}</span>` : ''}
              </div>
              ${t.description ? `<p class="text-xs text-gray-400 mt-1 truncate">${t.description}</p>` : ''}
              ${syllabusHTML}
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <button onclick="window.location.href='/admin/test-creator/${t._id}'"
                      class="text-garud-accent hover:text-garud-highlight text-sm px-3 py-1.5 rounded hover:bg-garud-accent/10">Edit</button>
              <button onclick="removeTest('${t._id}')"
                      class="text-red-400 hover:text-red-600 text-sm px-3 py-1.5 rounded hover:bg-red-50">Remove</button>
            </div>
          </div>
        </div>`;
      }).join('');
    }

    // All tests picker list
    renderAllTests();
  }

  function renderAllTests() {
    const el = document.getElementById('all-tests-list');
    el.innerHTML = allTests.map(t => {
      const inSeries   = series.tests.some(s => s._id === t._id);
      const totalQ     = t.sections ? t.sections.reduce((sum, s) => sum + s.questions.length, 0) : 0;
      const isPractice = t.mode === 'practice';
      const modeLabel  = isPractice ? '🔁 Practice' : '🎯 Real';
      const modeColor  = isPractice ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';
      const schedText  = t.scheduledAt
        ? '📅 ' + new Date(t.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : '';
      return `
        <div class="flex items-center justify-between py-2.5 px-3 hover:bg-gray-50 rounded-lg gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-sm font-medium text-gray-800">${t.name}</p>
              <span class="px-1.5 py-0.5 text-xs rounded-full font-medium ${modeColor}">${modeLabel}</span>
              ${t.isPublished ? '<span class="px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Published</span>' : ''}
            </div>
            <p class="text-xs text-gray-400 mt-0.5">⏱ ${t.duration} min · 📝 ${totalQ} questions${schedText ? ' · ' + schedText : ''}</p>
          </div>
          <button onclick="${inSeries ? '' : `addTest('${t._id}')`}"
                  ${inSeries ? 'disabled' : ''}
                  class="text-sm px-3 py-1.5 rounded-lg flex-shrink-0 ${inSeries
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
