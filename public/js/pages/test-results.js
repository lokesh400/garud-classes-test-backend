/**
 * pages/test-results.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin');
  if (!user) return;

  // /admin/tests/:testId/results
  const parts = window.location.pathname.split('/');
  const testId = parts[3];

  try {
    const [results, testData] = await Promise.all([
      API.get(`/tests/${testId}/results`),
      API.get(`/tests/admin/${testId}`),
    ]);

    document.getElementById('test-name').textContent = testData.name;

    const rankColors = ['bg-yellow-100 text-yellow-700', 'bg-gray-100 text-gray-700', 'bg-orange-100 text-orange-700'];

    document.getElementById('results-body').innerHTML = results.map((r, i) => {
      const pct = r.maxScore > 0 ? ((r.totalScore / r.maxScore) * 100).toFixed(1) : 0;
      return `
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-3">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                         ${rankColors[i] || 'bg-white text-gray-500'}">
              ${i + 1}
            </span>
          </td>
          <td class="px-4 py-3 font-medium text-gray-800">${r.user?.name || '-'}</td>
          <td class="px-4 py-3 text-gray-500">${r.user?.email || '-'}</td>
          <td class="px-4 py-3 text-right font-bold text-garud-accent">${r.totalScore}</td>
          <td class="px-4 py-3 text-right text-gray-500">${r.maxScore}</td>
          <td class="px-4 py-3 text-right">
            <span class="font-medium ${pct >= 60 ? 'text-green-600' : 'text-red-600'}">${pct}%</span>
          </td>
          <td class="px-4 py-3 text-right text-gray-500 text-xs">
            ${r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'}
          </td>
        </tr>`;
    }).join('') || '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No results yet.</td></tr>';

  } catch { toast.error('Failed to load results'); }
  finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('table-wrap').classList.remove('hidden');
  }
});
