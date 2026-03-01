/**
 * pages/test-series-enrolled.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin');
  if (!user) return;

  // /admin/test-series/:seriesId/enrolled
  const parts    = window.location.pathname.split('/');
  const seriesId = parts[3];

  try {
    const data = await API.get(`/test-series/admin/${seriesId}`);
    const users = data.enrolledUsers || [];

    const el = document.getElementById('main-content');
    if (!users.length) {
      el.innerHTML = `
        <div class="bg-white rounded-xl shadow-md p-12 text-center text-gray-400">
          No users have purchased this test series yet.
        </div>`;
    } else {
      el.innerHTML = `
        <div class="bg-white rounded-xl shadow-md overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Enrolled</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${users.map(u => `
                <tr>
                  <td class="px-4 py-3 font-semibold text-gray-700">${u.name}</td>
                  <td class="px-4 py-3 text-gray-700">${u.email}</td>
                  <td class="px-4 py-3 text-xs text-gray-500">${u.enrolledAt ? new Date(u.enrolledAt).toLocaleString() : '-'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }
  } catch { toast.error('Failed to load enrolled users'); }
  finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
  }
});
