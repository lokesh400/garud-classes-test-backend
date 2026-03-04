/**
 * pages/results.js — comprehensive test result analytics
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  const testId = window.location.pathname.split('/')[3]; // /student/results/:testId

  // ── Tab switching ─────────────────────────────────────────────────
  const TABS = ['overview', 'sections', 'time', 'questions'];
  window.switchTab = function (name) {
    TABS.forEach(t => {
      document.getElementById(`panel-${t}`).classList.toggle('hidden', t !== name);
      const btn = document.getElementById(`tab-${t}`);
      btn.classList.toggle('border-garud-accent', t === name);
      btn.classList.toggle('text-garud-accent',   t === name);
      btn.classList.toggle('border-transparent',  t !== name);
      btn.classList.toggle('text-gray-500',       t !== name);
    });
    // Lazy-render charts when their tab becomes visible
    if (name === 'sections' && !window._chartsSection) renderSectionCharts();
    if (name === 'time'     && !window._chartsTime)    renderTimeCharts();
  };

  // ── Helpers ───────────────────────────────────────────────────────
  function fmt(sec) {
    if (!sec || sec <= 0) return '—';
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60), s = sec % 60;
    return s ? `${m}m ${s}s` : `${m}m`;
  }

  function pctBar(pct, color = '#0f3460') {
    const safe = Math.min(100, Math.max(0, pct));
    return `<div class="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div class="h-1.5 rounded-full transition-all" style="width:${safe}%;background:${color}"></div>
    </div>`;
  }

  function badge(text, cls) {
    return `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}">${text}</span>`;
  }

  function accColor(pct) {
    if (pct >= 80) return '#10b981';
    if (pct >= 60) return '#f59e0b';
    return '#e94560';
  }

  // ── Load data ─────────────────────────────────────────────────────
  try {
    const { attempt: result, test } = await API.get(`/tests/${testId}/my-result`);

    // ── Build flat question rows ──────────────────────────────────
    // Each row combines test section data (marks) + answer data (response + time)
    let globalQIdx = 0;
    const qRows = [];
    test.sections.forEach((sec) => {
      sec.questions.forEach((qEntry) => {
        const qId  = qEntry.question?._id;
        const secId = sec._id?.toString();
        const ans  = result.answers.find(a =>
          a.question && (a.question._id?.toString() === qId?.toString())
          && a.sectionId?.toString() === secId
        );
        globalQIdx++;
        const isAttempted = !!(ans?.selectedOption ||
          (ans?.numericalAnswer !== null && ans?.numericalAnswer !== undefined));
        qRows.push({
          globalIdx:       globalQIdx,
          sectionId:       sec._id,
          sectionName:     sec.name,
          question:        qEntry.question,
          positiveMarks:   qEntry.positiveMarks,
          negativeMarks:   qEntry.negativeMarks,
          selectedOption:  ans?.selectedOption   || null,
          numericalAnswer: ans?.numericalAnswer  ?? null,
          isCorrect:       ans?.isCorrect        || false,
          marksObtained:   ans?.marksObtained    || 0,
          timeSpent:       ans?.timeSpent        || 0,
          isAttempted,
        });
      });
    });

    // ── Overall stats ─────────────────────────────────────────────
    const totalQ     = qRows.length;
    const correct    = qRows.filter(r => r.isCorrect).length;
    const attempted  = qRows.filter(r => r.isAttempted).length;
    const wrong      = attempted - correct;
    const skipped    = totalQ - attempted;
    const pct        = result.maxScore > 0
      ? ((result.totalScore / result.maxScore) * 100).toFixed(1) : 0;
    const totalTime      = qRows.reduce((s, r) => s + r.timeSpent, 0);
    const avgTimePerQ    = totalQ > 0 ? Math.round(totalTime / totalQ) : 0;
    const correctRows    = qRows.filter(r => r.isCorrect);
    const wrongRows      = qRows.filter(r => r.isAttempted && !r.isCorrect);
    const avgTimeCorrect = correctRows.length
      ? Math.round(correctRows.reduce((s, r) => s + r.timeSpent, 0) / correctRows.length) : 0;
    const avgTimeWrong   = wrongRows.length
      ? Math.round(wrongRows.reduce((s, r) => s + r.timeSpent, 0) / wrongRows.length) : 0;
    const accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(1) : 0;

    // ── Grouping helpers ──────────────────────────────────────────
    function groupBy(rows, key) {
      const map = {};
      rows.forEach(r => {
        const k = key(r) || 'Unknown';
        if (!map[k]) map[k] = [];
        map[k].push(r);
      });
      return map;
    }

    const bySection = groupBy(qRows, r => r.sectionName);
    const bySubject = groupBy(qRows, r => r.question?.subject?.name);
    const byChapter = groupBy(qRows, r => r.question?.chapter?.name);

    function statsOf(rows) {
      const c  = rows.filter(r => r.isCorrect).length;
      const at = rows.filter(r => r.isAttempted).length;
      const w  = at - c;
      const sk = rows.length - at;
      const tt = rows.reduce((s, r) => s + r.timeSpent, 0);
      const av = rows.length ? Math.round(tt / rows.length) : 0;
      const acc = at > 0 ? ((c / at) * 100).toFixed(1) : '—';
      const sc   = rows.reduce((s, r) => s + r.marksObtained, 0);
      const maxSc = rows.reduce((s, r) => s + r.positiveMarks, 0);
      return { c, w, sk, tt, av, acc, sc, maxSc };
    }

    // ── Render header ─────────────────────────────────────────────
    document.getElementById('test-title').textContent = `${test.name} — Results`;
    document.getElementById('submitted-at').textContent =
      `Submitted: ${new Date(result.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`;

    const pctNum = parseFloat(pct);
    const grade  = pctNum >= 90 ? 'A+' : pctNum >= 80 ? 'A' : pctNum >= 70 ? 'B' : pctNum >= 60 ? 'C' : pctNum >= 40 ? 'D' : 'F';
    const gradeColor = pctNum >= 70 ? '#10b981' : pctNum >= 50 ? '#f59e0b' : '#e94560';
    document.getElementById('score-badge').innerHTML = `
      <div class="text-right">
        <div class="text-4xl font-black text-white">${pct}%</div>
        <div class="text-white/60 text-sm">${result.totalScore}/${result.maxScore} marks &nbsp;·&nbsp; Grade
          <span class="font-bold" style="color:${gradeColor}">${grade}</span>
        </div>
      </div>`;

    // ── Overview: Score cards ─────────────────────────────────────
    document.getElementById('score-cards').innerHTML = [
      { label: 'Score',      val: `${result.totalScore}/${result.maxScore}`, icon: '🎯', cls: 'stat-blue' },
      { label: 'Percentage', val: `${pct}%`,   icon: '📊', cls: pctNum >= 60 ? 'stat-green' : 'stat-red' },
      { label: 'Correct',    val: correct,      icon: '✅', cls: 'stat-green' },
      { label: 'Wrong',      val: wrong,        icon: '❌', cls: 'stat-red' },
      { label: 'Skipped',    val: skipped,      icon: '⬜', cls: 'stat-amber' },
      { label: 'Accuracy',   val: `${accuracy}%`, icon: '🎖', cls: 'stat-blue' },
    ].map(c => `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center stat-card ${c.cls} lift">
        <div class="text-xl mb-1">${c.icon}</div>
        <p class="text-2xl font-bold text-gray-800">${c.val}</p>
        <p class="text-xs text-gray-500 mt-0.5">${c.label}</p>
      </div>`).join('');

    // ── Overview: Donut chart ─────────────────────────────────────
    new Chart(document.getElementById('chart-donut'), {
      type: 'doughnut',
      data: {
        labels: ['Correct', 'Wrong', 'Skipped'],
        datasets: [{
          data: [correct, wrong, skipped],
          backgroundColor: ['#10b981', '#e94560', '#94a3b8'],
          borderWidth: 2, borderColor: '#fff',
        }],
      },
      options: {
        cutout: '70%', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} (${((ctx.raw / totalQ) * 100).toFixed(1)}%)` } },
        },
      },
    });
    document.getElementById('donut-center').innerHTML =
      `<div class="text-2xl font-bold text-gray-800">${pct}%</div>
       <div class="text-xs text-gray-400">Score</div>`;
    document.getElementById('donut-legend').innerHTML = [
      ['#10b981', `Correct (${correct})`],
      ['#e94560', `Wrong (${wrong})`],
      ['#94a3b8', `Skipped (${skipped})`],
    ].map(([c, l]) =>
      `<div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm inline-block" style="background:${c}"></span>${l}</div>`
    ).join('');

    // ── Overview: Section score bar chart ─────────────────────────
    const secLabels = Object.keys(bySection);
    const secScores = secLabels.map(n => statsOf(bySection[n]).sc);
    const secMax    = secLabels.map(n => statsOf(bySection[n]).maxSc);

    new Chart(document.getElementById('chart-section-score'), {
      type: 'bar',
      data: {
        labels: secLabels,
        datasets: [
          { label: 'Your Score', data: secScores, backgroundColor: '#0f3460', borderRadius: 6 },
          { label: 'Max Score',  data: secMax,    backgroundColor: '#e2e8f0', borderRadius: 6 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        },
      },
    });

    // ── Overview: Performance meter ───────────────────────────────
    document.getElementById('perf-meter').innerHTML = [
      { label: 'Correct',      val: correct,   total: totalQ, color: '#10b981' },
      { label: 'Wrong',        val: wrong,     total: totalQ, color: '#e94560' },
      { label: 'Skipped',      val: skipped,   total: totalQ, color: '#94a3b8' },
      { label: 'Attempt Rate', val: attempted, total: totalQ, color: '#f59e0b' },
    ].map(({ label, val, total, color }) => {
      const p = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
      return `<div class="mb-3">
        <div class="flex justify-between text-sm mb-1">
          <span class="font-medium text-gray-700">${label}</span>
          <span class="font-bold" style="color:${color}">${val} / ${total} &nbsp; (${p}%)</span>
        </div>
        ${pctBar(p, color)}
      </div>`;
    }).join('');

    // ── Sections tab: section table ───────────────────────────────
    document.getElementById('section-table-body').innerHTML = Object.entries(bySection).map(([name, rows]) => {
      const s = statsOf(rows);
      const accPct = s.acc === '—' ? 0 : parseFloat(s.acc);
      return `<tr class="hover:bg-gray-50">
        <td class="px-4 py-3 font-medium text-gray-800">${name}</td>
        <td class="px-3 py-3 text-center text-green-600 font-semibold">${s.c}</td>
        <td class="px-3 py-3 text-center text-red-500 font-semibold">${s.w}</td>
        <td class="px-3 py-3 text-center text-gray-400 font-semibold">${s.sk}</td>
        <td class="px-3 py-3 text-center font-bold text-gray-800">${s.sc}/${s.maxSc}</td>
        <td class="px-3 py-3 text-center">
          <span class="font-semibold" style="color:${accColor(accPct)}">${s.acc}%</span>
          ${pctBar(accPct, accColor(accPct))}
        </td>
      </tr>`;
    }).join('');

    // ── Sections tab: subject table ───────────────────────────────
    document.getElementById('subject-table-body').innerHTML = Object.entries(bySubject).map(([name, rows]) => {
      const s = statsOf(rows);
      const accPct = s.acc === '—' ? 0 : parseFloat(s.acc);
      return `<tr class="hover:bg-gray-50">
        <td class="px-4 py-3 font-medium text-gray-800">${name}</td>
        <td class="px-3 py-3 text-center text-green-600 font-semibold">${s.c}</td>
        <td class="px-3 py-3 text-center text-red-500 font-semibold">${s.w}</td>
        <td class="px-3 py-3 text-center text-gray-400 font-semibold">${s.sk}</td>
        <td class="px-3 py-3 text-center">
          <span class="font-semibold" style="color:${accColor(accPct)}">${s.acc}%</span>
          ${pctBar(accPct, accColor(accPct))}
        </td>
        <td class="px-3 py-3 text-center text-gray-600">${fmt(s.av)}</td>
      </tr>`;
    }).join('');

    // ── Sections tab: chapter table ───────────────────────────────
    document.getElementById('chapter-table-body').innerHTML = Object.entries(byChapter).map(([name, rows]) => {
      const s = statsOf(rows);
      const accPct = s.acc === '—' ? 0 : parseFloat(s.acc);
      const subjName = rows[0]?.question?.subject?.name || '—';
      return `<tr class="hover:bg-gray-50">
        <td class="px-4 py-3 font-medium text-gray-800">${name}</td>
        <td class="px-4 py-3 text-gray-500">${subjName}</td>
        <td class="px-3 py-3 text-center text-green-600 font-semibold">${s.c}</td>
        <td class="px-3 py-3 text-center text-red-500 font-semibold">${s.w}</td>
        <td class="px-3 py-3 text-center text-gray-400 font-semibold">${s.sk}</td>
        <td class="px-3 py-3 text-center">
          <span class="font-semibold" style="color:${accColor(accPct)}">${s.acc}%</span>
          ${pctBar(accPct, accColor(accPct))}
        </td>
        <td class="px-3 py-3 text-center text-gray-600">${fmt(s.av)}</td>
      </tr>`;
    }).join('');

    // ── Time tab: summary cards ───────────────────────────────────
    document.getElementById('time-cards').innerHTML = [
      { label: 'Total Time Used',     val: fmt(totalTime),      icon: '⏱', cls: 'stat-blue' },
      { label: 'Avg Time / Question', val: fmt(avgTimePerQ),    icon: '📐', cls: 'stat-amber' },
      { label: 'Avg Time (Correct)',  val: fmt(avgTimeCorrect), icon: '✅', cls: 'stat-green' },
      { label: 'Avg Time (Wrong)',    val: fmt(avgTimeWrong),   icon: '❌', cls: 'stat-red' },
    ].map(c => `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center stat-card ${c.cls} lift">
        <div class="text-2xl mb-1">${c.icon}</div>
        <p class="text-xl font-bold text-gray-800">${c.val}</p>
        <p class="text-xs text-gray-500 mt-0.5">${c.label}</p>
      </div>`).join('');

    // ── Time tab: per-question time table ─────────────────────────
    document.getElementById('time-table-body').innerHTML = qRows.map(r => {
      const vAvg = r.timeSpent === 0 ? '—'
        : r.timeSpent > avgTimePerQ
        ? `<span class="text-orange-500">+${fmt(r.timeSpent - avgTimePerQ)}</span>`
        : `<span class="text-blue-500">-${fmt(avgTimePerQ - r.timeSpent)}</span>`;
      const resultBadge = r.isCorrect
        ? badge('Correct', 'bg-green-100 text-green-700')
        : r.isAttempted
        ? badge('Wrong', 'bg-red-100 text-red-600')
        : badge('Skipped', 'bg-gray-100 text-gray-500');
      const marksCls = r.marksObtained > 0 ? 'text-green-600' : r.marksObtained < 0 ? 'text-red-500' : 'text-gray-400';
      return `<tr class="hover:bg-gray-50">
        <td class="px-4 py-2.5 text-center font-mono text-gray-500">${r.globalIdx}</td>
        <td class="px-4 py-2.5 text-gray-700">${r.sectionName}</td>
        <td class="px-4 py-2.5 text-gray-600">${r.question?.subject?.name || '—'}</td>
        <td class="px-3 py-2.5 text-center">${resultBadge}</td>
        <td class="px-3 py-2.5 text-center font-mono font-semibold text-gray-800">${fmt(r.timeSpent)}</td>
        <td class="px-3 py-2.5 text-center text-xs">${vAvg}</td>
        <td class="px-3 py-2.5 text-center font-bold ${marksCls}">${r.marksObtained > 0 ? '+' : ''}${r.marksObtained}</td>
      </tr>`;
    }).join('');

    // ── Questions filter + render ─────────────────────────────────
    window.filterQuestions = function (type) {
      document.querySelectorAll('.qfilter-btn').forEach(b => b.classList.remove('active-qf'));
      document.getElementById(`qf-${type}`)?.classList.add('active-qf');
      document.querySelectorAll('.q-card').forEach(el => {
        const t = el.dataset.type;
        el.dataset.hidden = (type !== 'all' && t !== type) ? 'true' : 'false';
      });
    };

    document.getElementById('questions-list').innerHTML = qRows.map(r => {
      const q          = r.question;
      const resultType = r.isCorrect ? 'correct' : r.isAttempted ? 'wrong' : 'skipped';
      const borderCls  = r.isCorrect ? 'border-green-300' : r.isAttempted ? 'border-red-300' : 'border-gray-200';
      const dotBg      = r.isCorrect ? 'bg-green-500' : r.isAttempted ? 'bg-red-500' : 'bg-gray-400';
      const marksCls   = r.marksObtained > 0 ? 'text-green-600' : r.marksObtained < 0 ? 'text-red-500' : 'text-gray-400';

      let answerHtml = '';
      if (q?.type === 'mcq') {
        const yourColor = r.isCorrect ? 'text-green-700 bg-green-50' : r.isAttempted ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50';
        answerHtml = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold ${yourColor}">
            Your: ${r.selectedOption || 'Not answered'}
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold text-green-700 bg-green-50">
            Correct: ${q.correctOption || '?'}
          </span>`;
      } else {
        const yourColor = r.isCorrect ? 'text-green-700 bg-green-50' : r.isAttempted ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50';
        const yourAns   = r.numericalAnswer !== null && r.numericalAnswer !== undefined ? r.numericalAnswer : 'Not answered';
        answerHtml = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold ${yourColor}">
            Your: ${yourAns}
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold text-green-700 bg-green-50">
            Correct: ${q?.correctNumericalAnswer ?? '?'}
          </span>`;
      }

      return `
        <div class="q-card bg-white rounded-2xl shadow-sm border-2 ${borderCls} overflow-hidden" data-type="${resultType}" data-hidden="false">
          <div class="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100 flex-wrap gap-2">
            <div class="flex items-center gap-2.5 flex-wrap">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${dotBg}">${r.globalIdx}</div>
              <span class="text-xs text-gray-500 font-medium">${r.sectionName}</span>
              ${q?.subject?.name  ? `<span class="text-xs text-blue-500 font-medium">${q.subject.name}</span>` : ''}
              ${q?.chapter?.name  ? `<span class="text-xs text-gray-400">${q.chapter.name}</span>` : ''}
              ${q?.topic?.name    ? `<span class="text-xs text-gray-300">${q.topic.name}</span>` : ''}
            </div>
            <div class="flex items-center gap-3 text-xs flex-shrink-0">
              <span class="text-gray-400">⏱ ${r.timeSpent > 0 ? fmt(r.timeSpent) : '—'}</span>
              <span class="font-bold ${marksCls}">${r.marksObtained > 0 ? '+' : ''}${r.marksObtained} marks</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${r.isCorrect ? 'bg-green-100 text-green-700' : r.isAttempted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}">
                ${r.isCorrect ? 'Correct' : r.isAttempted ? 'Wrong' : 'Skipped'}
              </span>
            </div>
          </div>
          <div class="p-5">
            ${q?.imageUrl ? `
            <div class="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden mb-4 p-2">
              <img src="${q.imageUrl}" alt="Q${r.globalIdx}"
                   class="q-img"
                   onerror="this.parentElement.innerHTML='<span class=\\'text-gray-400 text-sm p-4\\'>Image unavailable</span>'" />
            </div>` : ''}
            <div class="flex flex-wrap gap-2 items-center">
              ${answerHtml}
              <span class="ml-auto text-xs text-gray-400">+${r.positiveMarks} / −${r.negativeMarks}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    // ── Store data for lazy chart rendering ───────────────────────
    window._bySection   = bySection;
    window._bySubject   = bySubject;
    window._qRows       = qRows;
    window._avgTimePerQ = avgTimePerQ;

    window.renderSectionCharts = function () {
      window._chartsSection = true;
      const subjNames = Object.keys(bySubject);
      const subjAcc   = subjNames.map(n => {
        const s = statsOf(bySubject[n]);
        return s.acc === '—' ? 0 : parseFloat(s.acc);
      });
      new Chart(document.getElementById('chart-subject-acc'), {
        type: 'bar',
        data: {
          labels: subjNames,
          datasets: [{
            label: 'Accuracy (%)',
            data:  subjAcc,
            backgroundColor: subjAcc.map(v => accColor(v)),
            borderRadius: 6,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { min: 0, max: 100, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } },
            y: { grid: { display: false } },
          },
        },
      });
    };

    window.renderTimeCharts = function () {
      window._chartsTime = true;
      const labels = qRows.map(r => `Q${r.globalIdx}`);
      const times  = qRows.map(r => r.timeSpent);
      const colors = qRows.map(r => r.isCorrect ? '#10b981' : r.isAttempted ? '#e94560' : '#94a3b8');

      // Time per question bar chart
      new Chart(document.getElementById('chart-time-per-q'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: 'Time (s)', data: times, backgroundColor: colors, borderRadius: 4 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: {
              label: ctx => ` ${fmt(ctx.raw)}  · ${qRows[ctx.dataIndex].sectionName}`,
            }},
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => fmt(v) } },
          },
        },
      });

      // Section time donut
      const secNames = Object.keys(bySection);
      const secTimes = secNames.map(n => statsOf(bySection[n]).tt);
      const PALETTE  = ['#0f3460', '#e94560', '#f59e0b', '#10b981', '#6366f1', '#ec4899'];
      new Chart(document.getElementById('chart-section-time'), {
        type: 'doughnut',
        data: {
          labels: secNames,
          datasets: [{ data: secTimes, backgroundColor: PALETTE, borderWidth: 2, borderColor: '#fff' }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}` } },
          },
        },
      });

      // Avg time: correct vs wrong bar
      const skippedRows = qRows.filter(r => !r.isAttempted);
      const avgTimeSkipped = skippedRows.length
        ? Math.round(skippedRows.reduce((s, r) => s + r.timeSpent, 0) / skippedRows.length) : 0;
      new Chart(document.getElementById('chart-time-cw'), {
        type: 'bar',
        data: {
          labels: ['Correct', 'Wrong', 'Skipped'],
          datasets: [{
            data: [avgTimeCorrect, avgTimeWrong, avgTimeSkipped],
            backgroundColor: ['#10b981', '#e94560', '#94a3b8'],
            borderRadius: 8,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` Avg: ${fmt(ctx.raw)}` } },
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => fmt(v) } },
          },
        },
      });
    };

  } catch (err) {
    toast.error('No results found');
    window.location.href = '/student/dashboard';
  } finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
  }
});
