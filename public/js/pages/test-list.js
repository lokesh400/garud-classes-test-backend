/**
 * pages/test-list.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin');
  if (!user) return;

  let tests = [];

  async function fetchTests() {
    try {
      tests = await API.get('/tests/admin/all');
      renderTests();
    } catch { toast.error('Failed to load tests'); }
    finally {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('tests-list').classList.remove('hidden');
    }
  }

  function renderTests() {
    const el = document.getElementById('tests-list');
    if (!tests.length) {
      el.innerHTML = '<div class="bg-white rounded-xl shadow-md p-12 text-center text-gray-400">No tests yet. Create one above.</div>';
      return;
    }
    el.innerHTML = tests.map(t => `
      <div class="bg-white rounded-xl shadow-md p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div class="flex items-center gap-3">
            <h3 class="font-bold text-gray-800">${t.name}</h3>
            <span class="px-2 py-0.5 text-xs rounded-full font-medium ${t.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
              ${t.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
          ${t.description ? `<p class="text-sm text-gray-500 mt-1">${t.description}</p>` : ''}
          <p class="text-xs text-gray-400 mt-1">⏱ ${t.duration} min · ${t.sections.reduce((a,s)=>a+s.questions.length,0)} questions</p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button onclick="window.location.href='/admin/tests/${t._id}'"
                  class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">✏ Edit</button>
          <button onclick="window.location.href='/admin/tests/${t._id}/results'"
                  class="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">📊 Results</button>
          <button onclick="togglePublish('${t._id}', ${t.isPublished})"
                  class="px-3 py-2 text-sm ${t.isPublished ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'} rounded-lg transition">
            ${t.isPublished ? '🙈 Unpublish' : '🚀 Publish'}
          </button>
          <button onclick="deleteTest('${t._id}')"
                  class="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">🗑</button>
        </div>
      </div>`).join('');
  }

  window.toggleCreate = function() {
    document.getElementById('create-form-wrap').classList.toggle('hidden');
  };

  window.togglePublish = async function(id, current) {
    try {
      await API.put(`/tests/${id}`, { isPublished: !current });
      toast.success(current ? 'Test unpublished' : 'Test published!');
      fetchTests();
    } catch { toast.error('Failed to update'); }
  };

  window.deleteTest = async function(id) {
    if (!confirm('Delete this test? All student attempts will also be deleted.')) return;
    try {
      await API.delete(`/tests/${id}`);
      toast.success('Test deleted');
      fetchTests();
    } catch { toast.error('Failed to delete'); }
  };

  document.getElementById('create-test-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const test = await API.post('/tests', {
        name:        document.getElementById('test-name').value.trim(),
        duration:    parseInt(document.getElementById('test-duration').value),
        description: document.getElementById('test-desc').value.trim(),
      });
      toast.success('Test created!');
      window.location.href = `/admin/tests/${test._id}`;
    } catch (err) { toast.error(err.message || 'Failed to create test'); }
  });

  await fetchTests();
});
