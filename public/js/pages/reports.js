/**
 * pages/reports.js — Admin question reports viewer
 * Depends on: api.js, toast.js, auth-guard.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  requireAuth('admin');

  let allReports   = [];
  let currentFilter = 'all';
  let activeReportId = null;

  // ── Load ───────────────────────────────────────────────────────────
  window.loadReports = async function() {
    document.getElementById('reports-loading').classList.remove('hidden');
    document.getElementById('reports-list').classList.add('hidden');
    document.getElementById('reports-empty').classList.add('hidden');
    try {
      allReports = await API.get('/reports');
      renderReports();
    } catch (err) {
      toast.error('Failed to load reports: ' + (err.message || ''));
    } finally {
      document.getElementById('reports-loading').classList.add('hidden');
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────
  window.setFilter = function(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('f-' + filter)?.classList.add('active');
    renderReports();
  };

  // ── Render ─────────────────────────────────────────────────────────
  function renderReports() {
    const filtered = currentFilter === 'all'
      ? allReports
      : allReports.filter(r => r.status === currentFilter);

    document.getElementById('report-count').textContent =
      `${filtered.length} report${filtered.length !== 1 ? 's' : ''}`;

    const listEl = document.getElementById('reports-list');
    const emptyEl = document.getElementById('reports-empty');

    if (filtered.length === 0) {
      listEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');

    listEl.innerHTML = filtered.map(r => reportCard(r)).join('');
  }

  function statusBadge(status) {
    const map = {
      pending:  'bg-yellow-100 text-yellow-700',
      reviewed: 'bg-blue-100 text-blue-700',
      resolved: 'bg-green-100 text-green-700',
    };
    const icon = { pending: '⏳', reviewed: '🔍', resolved: '✅' };
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}">
      ${icon[status] || ''} ${status}
    </span>`;
  }

  function typeBadge(type) {
    const map = {
      mcq:       'bg-purple-100 text-purple-700',
      msq:       'bg-orange-100 text-orange-700',
      numerical: 'bg-blue-100 text-blue-700',
    };
    return type
      ? `<span class="px-2 py-0.5 rounded text-xs font-semibold ${map[type] || 'bg-gray-100 text-gray-500'}">${type.toUpperCase()}</span>`
      : '';
  }

  function reportedAnswerHtml(r) {
    const q = r.question;
    if (!q) return '<span class="text-gray-400 text-xs">Question deleted</span>';
    if (q.type === 'numerical') {
      const reported = r.reportedNumericalAnswer !== null && r.reportedNumericalAnswer !== undefined
        ? `<span class="font-mono font-bold text-blue-600">${r.reportedNumericalAnswer}</span>`
        : '<span class="text-gray-400">—</span>';
      const correct = q.correctNumericalAnswer !== null && q.correctNumericalAnswer !== undefined
        ? `<span class="font-mono font-bold text-green-600">${q.correctNumericalAnswer}</span>`
        : '<span class="text-gray-400">not set</span>';
      return `
        <div class="flex flex-wrap gap-6 text-xs">
          <div><p class="text-gray-400 mb-0.5">Stored answer</p>${correct}</div>
          <div><p class="text-gray-400 mb-0.5">Student suggests</p>${reported}</div>
        </div>`;
    }
    // MCQ / MSQ
    const correctOpts = q.type === 'msq'
      ? (q.correctOptions || [])
      : (q.correctOption ? [q.correctOption] : []);
    const reportedOpts = r.reportedOptions || [];

    const renderOpts = (opts, colorClass) =>
      opts.length > 0
        ? opts.map(o => `<span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}">${o}</span>`).join('')
        : '<span class="text-gray-400 text-xs">—</span>';

    return `
      <div class="flex flex-wrap gap-6 text-xs">
        <div>
          <p class="text-gray-400 mb-1.5">Stored answer</p>
          <div class="flex gap-1.5">${renderOpts(correctOpts, 'bg-green-100 text-green-700')}</div>
        </div>
        <div>
          <p class="text-gray-400 mb-1.5">Student suggests</p>
          <div class="flex gap-1.5">${renderOpts(reportedOpts, 'bg-red-100 text-red-700')}</div>
        </div>
      </div>`;
  }

  function reportCard(r) {
    const q        = r.question;
    const imgUrl   = q?.imageUrl || '';
    const dateStr  = new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    return `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 fade-up">
        <div class="flex flex-col md:flex-row md:items-start gap-4">

          <!-- Question image -->
          ${imgUrl ? `
            <div class="flex-shrink-0">
              <img src="${imgUrl}" alt="Question"
                   class="w-full md:w-48 max-h-40 object-contain rounded-xl border border-gray-100 bg-gray-50"/>
            </div>` : `
            <div class="flex-shrink-0 w-24 h-20 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-xs">
              No image
            </div>`}

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-3">
              ${statusBadge(r.status)}
              ${typeBadge(q?.type)}
              <span class="text-xs text-gray-400">${dateStr}</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Test</p>
                <p class="text-sm font-medium text-gray-700">${r.test?.name || '—'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Reported by</p>
                <p class="text-sm font-medium text-gray-700">${r.user?.name || '—'} <span class="text-gray-400 font-normal">(${r.user?.email || ''})</span></p>
              </div>
            </div>

            <!-- Answer comparison -->
            <div class="bg-gray-50 rounded-xl p-3 mb-3">
              ${reportedAnswerHtml(r)}
            </div>

            ${r.comment ? `
              <div class="text-sm text-gray-600 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2 mb-3">
                <span class="text-yellow-600 font-semibold text-xs">Student comment: </span>${r.comment}
              </div>` : ''}

            <!-- Actions -->
            <div class="flex gap-2">
              <button onclick="openStatusModal('${r._id}')"
                      class="px-4 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
                Change Status
              </button>
              ${r.question?._id ? `
              <a href="/admin/question-bank" target="_blank"
                 class="px-4 py-1.5 border border-blue-200 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition">
                View Question
              </a>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }

  // ── Status modal ───────────────────────────────────────────────────
  window.openStatusModal = function(reportId) {
    activeReportId = reportId;
    document.getElementById('status-modal').classList.remove('hidden');
  };

  window.closeStatusModal = function() {
    activeReportId = null;
    document.getElementById('status-modal').classList.add('hidden');
  };

  window.updateStatus = async function(status) {
    if (!activeReportId) return;
    try {
      await API.patch(`/reports/${activeReportId}`, { status });
      const idx = allReports.findIndex(r => r._id === activeReportId);
      if (idx !== -1) allReports[idx].status = status;
      closeStatusModal();
      renderReports();
      toast.success('Status updated to ' + status);
    } catch { toast.error('Failed to update status'); }
  };

  // ── Init ───────────────────────────────────────────────────────────
  await loadReports();
});
