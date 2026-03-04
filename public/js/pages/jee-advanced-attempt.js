/**
 * pages/jee-advanced-attempt.js — JEE Advanced NTA-style interface
 * Supports MCQ (single), MSQ (multiple select), and Numerical question types.
 * Depends on: api.js, toast.js, auth-guard.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  // URL: /student/jee-test/:testId  OR  /student/jee-test/:batchId/:testId
  const _pathParts = window.location.pathname.split('/');
  const _hasBatch  = _pathParts.length >= 5 && _pathParts[4];
  const testId  = _hasBatch ? _pathParts[4] : _pathParts[3];
  const batchId = _hasBatch ? _pathParts[3] : null;

  let test    = null;
  let attempt = null;
  let timeLeft = 0;
  let timerInterval = null;

  let currentSection  = 0;
  let currentQuestion = 0;

  // answers      : { key: { selectedOption, selectedOptions, numericalAnswer } }
  // visited      : { key: true }
  // reviewed     : { key: true }
  // timeSpentMap : { key: seconds }
  const answers      = {};
  const visited      = {};
  const reviewed     = {};
  const timeSpentMap = {};
  let questionEnteredAt = null;

  const storageKey = `jee-attempt-${batchId || 'free'}-${testId}-${user._id || user.id}`;

  // ── LocalStorage ──────────────────────────────────────────────────
  function saveToLocalStorage() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, visited, reviewed, timeSpentMap }));
    } catch (_) {}
  }

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.answers)      Object.assign(answers,      s.answers);
      if (s.visited)      Object.assign(visited,      s.visited);
      if (s.reviewed)     Object.assign(reviewed,     s.reviewed);
      if (s.timeSpentMap) Object.assign(timeSpentMap, s.timeSpentMap);
    } catch (_) {}
  }

  // ── Status ────────────────────────────────────────────────────────
  function getStatus(key) {
    const ans = answers[key];
    const isAnswered =
      ans?.selectedOption != null ||
      (Array.isArray(ans?.selectedOptions) && ans.selectedOptions.length > 0) ||
      (ans?.numericalAnswer != null && ans?.numericalAnswer !== '');
    const isVisited  = !!visited[key];
    const isReviewed = !!reviewed[key];

    if (isReviewed && isAnswered) return 'answered-marked';
    if (isReviewed)               return 'marked';
    if (isAnswered)               return 'answered';
    if (isVisited)                return 'not-answered';
    return 'not-visited';
  }

  const statusClass = {
    'not-visited':     'bg-[#c0c0c0] text-gray-700',
    'not-answered':    'bg-[#e74c3c] text-white',
    'answered':        'bg-[#27ae60] text-white',
    'marked':          'bg-[#8e44ad] text-white',
    'answered-marked': 'bg-[#8e44ad] text-white ring-2 ring-[#27ae60] ring-offset-1',
  };

  // ── Start test ────────────────────────────────────────────────────
  async function startTest() {
    try {
      const res = await API.post(`/tests/${testId}/start`, batchId ? { batchId } : {});
      test    = res.test;
      attempt = res.attempt;

      const startedAt = new Date(attempt.startedAt).getTime();
      const duration  = test.duration * 60;
      const elapsed   = Math.floor((Date.now() - startedAt) / 1000);
      timeLeft        = Math.max(0, duration - elapsed);

      if (attempt.answers) {
        attempt.answers.forEach(a => {
          const key = `${a.sectionId}_${a.question}`;
          answers[key] = {
            selectedOption:  a.selectedOption,
            selectedOptions: a.selectedOptions || [],
            numericalAnswer: a.numericalAnswer,
          };
          visited[key] = true;
          if (a.timeSpent) timeSpentMap[key] = a.timeSpent;
        });
      }
      loadFromLocalStorage();

      initUI();
      startTimer();
      navigateTo(0, 0);

      document.getElementById('loading').classList.add('hidden');
      showStartScreen();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already submitted')) {
        toast.error('You have already submitted this test');
        window.location.href = `/student/results/${testId}`;
      } else if (msg.toLowerCase().includes('not yet available')) {
        document.getElementById('loading').classList.add('hidden');
        showLockedScreen(err.data?.scheduledAt || null);
      } else {
        document.getElementById('loading').classList.add('hidden');
        const screen = document.getElementById('start-screen');
        if (screen) {
          screen.innerHTML = `
            <div class="relative z-10 text-center px-6 max-w-lg w-full fade-up">
              <div class="bg-white/10 backdrop-blur-sm border border-white/15 rounded-3xl p-8 mb-6">
                <div class="text-5xl mb-4">⚠️</div>
                <h2 class="text-2xl font-bold text-white mb-2">Could not start test</h2>
                <p class="text-white/70 text-sm mb-6">${msg || 'An unexpected error occurred.'}</p>
                <button onclick="window.history.back()"
                        class="w-full py-3 bg-white/20 text-white font-semibold rounded-2xl hover:bg-white/30 transition">← Go Back</button>
              </div>
            </div>`;
          screen.classList.remove('hidden');
        } else {
          toast.error(msg || 'Failed to start test');
          window.history.back();
        }
      }
    }
  }

  function showLockedScreen(scheduledAt) {
    const screen = document.getElementById('start-screen');
    if (!screen) { alert('Test not yet available.'); window.history.back(); return; }
    const timeStr = scheduledAt
      ? new Date(scheduledAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
      : 'a scheduled time';
    screen.innerHTML = `
      <div class="relative z-10 text-center px-6 max-w-lg w-full fade-up">
        <div class="flex items-center justify-center gap-2.5 mb-8">
          <div class="w-10 h-10 rounded-xl bg-garud-highlight flex items-center justify-center">
            <span class="text-white font-black text-lg">G</span>
          </div>
          <span class="text-2xl font-black text-white">GARUD <span class="text-garud-highlight">Classes</span></span>
        </div>
        <div class="bg-white/10 backdrop-blur-sm border border-white/15 rounded-3xl p-8 mb-6">
          <div class="text-5xl mb-4">🔒</div>
          <h2 class="text-2xl font-bold text-white mb-2">Test Not Yet Available</h2>
          <p class="text-white/60 text-sm mb-4">This test will be available from:</p>
          <p class="text-orange-300 font-bold text-lg mb-6">${timeStr}</p>
          <button onclick="window.history.back()"
                  class="w-full py-3 bg-white/20 text-white font-semibold rounded-2xl hover:bg-white/30 transition">← Go Back</button>
        </div>
      </div>`;
    screen.classList.remove('hidden');
  }

  function showStartScreen() {
    const screen = document.getElementById('start-screen');
    if (!screen) { launchTest(); return; }

    document.getElementById('start-test-name').textContent = test.name || 'Test';
    const totalQ = test.sections.reduce((s, sec) => s + sec.questions.length, 0);
    const totalMarks = test.sections.reduce((sum, sec) =>
      sum + sec.questions.reduce((s2, q) => s2 + (q.positiveMarks || 4), 0), 0);
    document.getElementById('start-qs').textContent       = totalQ;
    document.getElementById('start-duration').textContent = test.duration || '—';
    document.getElementById('start-marks').textContent    = totalMarks;

    const metaEl = document.getElementById('start-test-meta');
    if (metaEl && test.mode) {
      const isPractice = test.mode === 'practice';
      metaEl.innerHTML = `<span class="inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-semibold
        ${isPractice ? 'bg-blue-500/30 text-blue-200' : 'bg-purple-500/30 text-purple-200'}">
        ${isPractice ? '🔁 Practice Mode' : '🎯 Real Mode — one submission only'}
      </span>`;
    }

    const syllabusContainer = document.getElementById('start-syllabus-wrap');
    if (syllabusContainer) {
      if (test.syllabus && test.syllabus.trim()) {
        const lines = test.syllabus.trim().split('\n').map(l => `<li class="text-white/70 text-xs">${l}</li>`).join('');
        syllabusContainer.innerHTML = `
          <div class="bg-white/10 rounded-xl px-4 py-3 text-left mb-4">
            <p class="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">📋 Syllabus</p>
            <ul class="space-y-0.5 list-disc list-inside">${lines}</ul>
          </div>`;
        syllabusContainer.classList.remove('hidden');
      }
    }

    screen.classList.remove('hidden');
    document.getElementById('start-exam-btn').onclick = () => {
      screen.classList.add('hidden');
      launchTest();
    };
  }

  function launchTest() {
    document.getElementById('test-ui').classList.remove('hidden');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  // ── UI init ───────────────────────────────────────────────────────
  function initUI() {
    document.getElementById('test-name').textContent = test.name;
    renderSectionTabs();
  }

  function renderSectionTabs() {
    const tabsEl = document.getElementById('section-tabs');
    tabsEl.innerHTML = test.sections.map((s, i) => {
      const answered = s.questions.filter(q => {
        const k = `${s._id}_${q.question._id}`;
        const st = getStatus(k);
        return st === 'answered' || st === 'answered-marked';
      }).length;
      const isActive = i === currentSection;
      return `
        <button id="tab-${i}" onclick="switchSection(${i})"
                class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition flex items-center gap-1.5
                       ${isActive ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
          ${s.name}
          <span class="text-xs ${isActive ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'} rounded-full px-1.5 py-0.5 font-semibold">
            ${answered}/${s.questions.length}
          </span>
        </button>`;
    }).join('');
  }

  // ── Time tracking ─────────────────────────────────────────────────
  function flushCurrentTime() {
    if (!questionEnteredAt) return;
    const sec    = test.sections[currentSection];
    const qEntry = sec?.questions[currentQuestion];
    if (!qEntry) return;
    const key = `${sec._id}_${qEntry.question._id}`;
    timeSpentMap[key] = (timeSpentMap[key] || 0) + Math.floor((Date.now() - questionEnteredAt) / 1000);
    questionEnteredAt = Date.now();
    saveToLocalStorage();
  }

  // ── Navigation ────────────────────────────────────────────────────
  function navigateTo(secIdx, qIdx) {
    flushCurrentTime();
    currentSection  = secIdx;
    currentQuestion = qIdx;
    questionEnteredAt = Date.now();

    const sec    = test.sections[secIdx];
    const qEntry = sec?.questions[qIdx];
    if (!qEntry) return;

    const key = `${sec._id}_${qEntry.question._id}`;
    visited[key] = true;

    renderQuestion(sec, qEntry, key);
    renderPalette(false);
    renderPalette(true);
    renderSectionTabs();
  }

  window.switchSection = function(idx) {
    getCurrentAnswer();
    navigateTo(idx, 0);
  };

  // ── Render question ───────────────────────────────────────────────
  function renderQuestion(sec, qEntry, key) {
    const q   = qEntry.question;
    const ans = answers[key];
    const type = q.type; // 'mcq' | 'msq' | 'numerical'

    // Number
    document.getElementById('q-number').textContent = `Q ${currentQuestion + 1} / ${sec.questions.length}`;

    // Type badge
    const typeEl = document.getElementById('q-type');
    if (type === 'msq') {
      typeEl.textContent = 'MSQ';
      typeEl.className = 'text-xs px-2 py-0.5 rounded font-medium bg-orange-100 text-orange-700';
    } else if (type === 'numerical') {
      typeEl.textContent = 'INTEGER';
      typeEl.className = 'text-xs px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-700';
    } else {
      typeEl.textContent = 'MCQ';
      typeEl.className = 'text-xs px-2 py-0.5 rounded font-medium bg-purple-100 text-purple-700';
    }

    // Marks badge
    const marksEl = document.getElementById('q-marks');
    if (type === 'msq') {
      marksEl.innerHTML = `
        <span class="bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">+${qEntry.positiveMarks} (all correct)</span>
        <span class="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-semibold">+1/correct (partial, no wrong)</span>
        <span class="bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">−${qEntry.negativeMarks} (any wrong)</span>`;
    } else if (type === 'numerical') {
      marksEl.innerHTML = `
        <span class="bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">+${qEntry.positiveMarks}</span>
        <span class="bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-semibold">0 (wrong — no negative)</span>`;
    } else {
      marksEl.innerHTML = `
        <span class="bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">+${qEntry.positiveMarks}</span>
        <span class="bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">−${qEntry.negativeMarks}</span>`;
    }

    // Image
    const imgEl = document.getElementById('q-image');
    imgEl.src = q.imageUrl || '';
    imgEl.style.display = q.imageUrl ? 'block' : 'none';

    // Show/hide question input sections
    document.getElementById('mcq-options').classList.toggle('hidden', type !== 'mcq');
    document.getElementById('msq-options').classList.toggle('hidden', type !== 'msq');
    document.getElementById('num-input').classList.toggle('hidden', type !== 'numerical');

    if (type === 'mcq') {
      const opts = ['A', 'B', 'C', 'D'];
      document.getElementById('option-buttons').innerHTML = opts.map(opt => {
        const selected = ans?.selectedOption === opt;
        return `
          <button onclick="selectMcq('${opt}')"
                  class="flex items-center gap-3 px-4 py-4 rounded-xl border-2 font-medium text-sm transition w-full text-left
                         ${selected
                           ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-sm'
                           : 'border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-gray-50'}">
            <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                         ${selected ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}">
              ${opt}
            </span>
            <span>Option ${opt}</span>
          </button>`;
      }).join('');
    } else if (type === 'msq') {
      const selectedOpts = ans?.selectedOptions || [];
      document.getElementById('msq-option-buttons').innerHTML = ['A', 'B', 'C', 'D'].map(opt => {
        const selected = selectedOpts.includes(opt);
        return `
          <label class="flex items-center gap-3 px-4 py-4 rounded-xl border-2 font-medium text-sm transition cursor-pointer w-full
                        ${selected
                          ? 'border-orange-500 bg-orange-50 text-orange-800 shadow-sm'
                          : 'border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-gray-50'}">
            <input type="checkbox" class="msq-cb hidden" value="${opt}" ${selected ? 'checked' : ''}
                   onchange="toggleMsq('${opt}', this.checked)"/>
            <span class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition
                         ${selected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}">
              ${selected ? '✓' : opt}
            </span>
            <span>Option ${opt}</span>
          </label>`;
      }).join('');
    } else {
      document.getElementById('numerical-answer').value = ans?.numericalAnswer ?? '';
    }
  }

  // ── Answer selection ──────────────────────────────────────────────
  window.selectMcq = function(opt) {
    const sec    = test.sections[currentSection];
    const qEntry = sec.questions[currentQuestion];
    const key    = `${sec._id}_${qEntry.question._id}`;
    answers[key] = { selectedOption: opt, selectedOptions: [], numericalAnswer: null };
    renderQuestion(sec, qEntry, key);
    renderPalette(false);
    renderPalette(true);
    saveToLocalStorage();
  };

  window.toggleMsq = function(opt, checked) {
    const sec    = test.sections[currentSection];
    const qEntry = sec.questions[currentQuestion];
    const key    = `${sec._id}_${qEntry.question._id}`;
    const cur    = answers[key]?.selectedOptions || [];
    const next   = checked ? [...new Set([...cur, opt])] : cur.filter(o => o !== opt);
    answers[key] = { selectedOption: null, selectedOptions: next, numericalAnswer: null };
    // Re-render to update styles
    renderQuestion(sec, qEntry, key);
    renderPalette(false);
    renderPalette(true);
    saveToLocalStorage();
  };

  // ── Capture current numerical answer ─────────────────────────────
  function getCurrentAnswer() {
    const sec    = test.sections[currentSection];
    const qEntry = sec.questions[currentQuestion];
    const key    = `${sec._id}_${qEntry.question._id}`;
    const q      = qEntry.question;

    if (q.type === 'numerical') {
      const val = document.getElementById('numerical-answer').value;
      answers[key] = {
        selectedOption:  null,
        selectedOptions: [],
        numericalAnswer: val !== '' ? parseFloat(val) : null,
      };
    }
    // MSQ is already updated live via toggleMsq clicks
    return { sec, qEntry, key };
  }

  // ── NTA button handlers ───────────────────────────────────────────
  window.handleSaveAndNext = function() {
    const { key } = getCurrentAnswer();
    delete reviewed[key];
    saveToLocalStorage();
    renderSectionTabs();
    goNext();
  };

  window.handleMarkAndNext = function() {
    const { key } = getCurrentAnswer();
    reviewed[key] = true;
    saveToLocalStorage();
    renderSectionTabs();
    goNext();
  };

  window.handleClearAnswer = function() {
    const sec    = test.sections[currentSection];
    const qEntry = sec.questions[currentQuestion];
    const key    = `${sec._id}_${qEntry.question._id}`;
    answers[key] = { selectedOption: null, selectedOptions: [], numericalAnswer: null };
    delete reviewed[key];
    renderQuestion(sec, qEntry, key);
    renderPalette(false);
    renderPalette(true);
    renderSectionTabs();
    saveToLocalStorage();
  };

  window.handlePrev = function() {
    getCurrentAnswer();
    if (currentQuestion > 0) {
      navigateTo(currentSection, currentQuestion - 1);
    } else if (currentSection > 0) {
      const prev = currentSection - 1;
      navigateTo(prev, test.sections[prev].questions.length - 1);
    }
  };

  window.handleNext = function() {
    getCurrentAnswer();
    goNext();
  };

  function goNext() {
    const sec = test.sections[currentSection];
    if (currentQuestion < sec.questions.length - 1) {
      navigateTo(currentSection, currentQuestion + 1);
    } else if (currentSection < test.sections.length - 1) {
      navigateTo(currentSection + 1, 0);
    }
  }

  // ── Palette ───────────────────────────────────────────────────────
  function renderPalette(mobile) {
    if (!test) return;
    const gridId  = mobile ? 'palette-grid-mobile'  : 'palette-grid';
    const statsId = mobile ? 'palette-stats-mobile' : 'palette-stats';
    const grid  = document.getElementById(gridId);
    const stats = document.getElementById(statsId);
    if (!grid || !stats) return;

    const sec = test.sections[currentSection];
    grid.innerHTML = sec.questions.map((qEntry, qi) => {
      const key = `${sec._id}_${qEntry.question._id}`;
      const st  = getStatus(key);
      const isActive = qi === currentQuestion;
      return `
        <button onclick="navigateTo(${currentSection}, ${qi})"
                title="Q${qi + 1} (${(qEntry.question.type || '').toUpperCase()})"
                class="w-8 h-8 rounded text-xs font-bold transition
                       ${statusClass[st]}
                       ${isActive ? 'ring-2 ring-orange-400 ring-offset-1 scale-110' : 'hover:scale-105'}">
          ${qi + 1}
        </button>`;
    }).join('');

    let answered = 0, notAnswered = 0, marked = 0, answeredMarked = 0, notVisited = 0;
    test.sections.forEach(s => s.questions.forEach(q => {
      const k  = `${s._id}_${q.question._id}`;
      const st = getStatus(k);
      if      (st === 'answered')         answered++;
      else if (st === 'not-answered')     notAnswered++;
      else if (st === 'marked')           marked++;
      else if (st === 'answered-marked')  answeredMarked++;
      else                                notVisited++;
    }));

    stats.innerHTML = `
      <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#27ae60] inline-block"></span><span>${answered} Answered</span></div>
      <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#e74c3c] inline-block"></span><span>${notAnswered} Not Answered</span></div>
      <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#8e44ad] inline-block"></span><span>${marked + answeredMarked} Marked</span></div>
      <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#c0c0c0] inline-block"></span><span>${notVisited} Not Visited</span></div>`;
  }

  window.togglePalette = function() {
    const overlay = document.getElementById('palette-overlay');
    const panel   = document.getElementById('palette-mobile');
    overlay.classList.toggle('hidden');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) renderPalette(true);
  };

  window.navigateTo = navigateTo;

  // ── Timer ─────────────────────────────────────────────────────────
  function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        submitTest(true);
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const hrs  = Math.floor(timeLeft / 3600);
    const mins = Math.floor((timeLeft % 3600) / 60);
    const secs = timeLeft % 60;
    const el   = document.getElementById('timer');
    const str  = hrs > 0
      ? `${hrs}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
      : `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    el.textContent = str;
    el.className   = `font-mono font-bold text-base px-3 py-1 rounded-lg min-w-[72px] text-center ${
      timeLeft < 300 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-50 text-blue-800'
    }`;
  }

  // ── Submit modal ──────────────────────────────────────────────────
  window.handleSubmit = function() {
    let answered = 0, notAnswered = 0, notVisited = 0, marked = 0;
    test.sections.forEach(s => s.questions.forEach(q => {
      const k  = `${s._id}_${q.question._id}`;
      const st = getStatus(k);
      if      (st === 'answered' || st === 'answered-marked') answered++;
      else if (st === 'not-answered')  notAnswered++;
      else if (st === 'marked')        marked++;
      else                             notVisited++;
    }));

    document.getElementById('submit-stats').innerHTML = `
      <div class="flex items-center gap-2 bg-green-50 rounded-lg p-2">
        <span class="w-3 h-3 rounded-sm bg-[#27ae60] flex-shrink-0"></span>
        <span class="font-semibold text-green-700">${answered}</span>
        <span class="text-gray-500">Answered</span>
      </div>
      <div class="flex items-center gap-2 bg-red-50 rounded-lg p-2">
        <span class="w-3 h-3 rounded-sm bg-[#e74c3c] flex-shrink-0"></span>
        <span class="font-semibold text-red-700">${notAnswered}</span>
        <span class="text-gray-500">Not Answered</span>
      </div>
      <div class="flex items-center gap-2 bg-purple-50 rounded-lg p-2">
        <span class="w-3 h-3 rounded-sm bg-[#8e44ad] flex-shrink-0"></span>
        <span class="font-semibold text-purple-700">${marked}</span>
        <span class="text-gray-500">Marked</span>
      </div>
      <div class="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
        <span class="w-3 h-3 rounded-sm bg-[#c0c0c0] flex-shrink-0"></span>
        <span class="font-semibold text-gray-600">${notVisited}</span>
        <span class="text-gray-500">Not Visited</span>
      </div>`;
    document.getElementById('submit-modal').classList.remove('hidden');
  };

  window.closeSubmitModal = function() {
    document.getElementById('submit-modal').classList.add('hidden');
  };

  window.confirmSubmit = function() {
    document.getElementById('submit-modal').classList.add('hidden');
    submitTest(false);
  };

  async function submitTest(auto) {
    if (timerInterval) clearInterval(timerInterval);
    flushCurrentTime();
    getCurrentAnswer();

    const allAnswers = [];
    test.sections.forEach(sec => {
      sec.questions.forEach(qEntry => {
        const key = `${sec._id}_${qEntry.question._id}`;
        const ans = answers[key] || {};
        allAnswers.push({
          questionId:      qEntry.question._id,
          sectionId:       sec._id,
          selectedOption:  ans.selectedOption  || null,
          selectedOptions: ans.selectedOptions || [],
          numericalAnswer: ans.numericalAnswer !== undefined ? ans.numericalAnswer : null,
          timeSpent:       timeSpentMap[key] || 0,
        });
      });
    });

    try {
      await API.post(`/tests/${testId}/submit`, { answers: allAnswers });
      try { localStorage.removeItem(storageKey); } catch (_) {}
      toast.success(auto ? 'Time up! Test auto-submitted.' : 'Test submitted successfully!');
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      window.location.href = `/student/results/${testId}`;
    } catch { toast.error('Failed to submit test'); }
  }

  await startTest();

  // ── Question Report modal ─────────────────────────────────────────
  let _reportQId   = null;
  let _reportQType = null;

  window.openReportModal = function() {
    const sec    = test.sections[currentSection];
    const qEntry = sec.questions[currentQuestion];
    const q      = qEntry.question;
    _reportQId   = q._id;
    _reportQType = q.type;

    const container = document.getElementById('report-answer-input');
    if (q.type === 'numerical') {
      container.innerHTML = `
        <label class="block text-xs font-semibold text-gray-500 mb-1">What do you think is the correct answer?</label>
        <input id="report-num-val" type="number" step="any"
               class="w-full md:w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:border-red-400 outline-none"
               placeholder="Enter number"/>`;
    } else {
      const label = q.type === 'msq'
        ? 'Select all options you think are correct:'
        : 'Select the option you think is correct:';
      container.innerHTML = `
        <label class="block text-xs font-semibold text-gray-500 mb-2">${label}</label>
        <div class="flex flex-col gap-2">
          ${['A','B','C','D'].map(opt => `
            <label class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 cursor-pointer hover:border-red-300 hover:bg-red-50 text-sm transition">
              <input type="checkbox" class="report-opt-cb" value="${opt}"/>
              <span class="w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center flex-shrink-0">${opt}</span>
              <span>Option ${opt}</span>
            </label>`).join('')}
        </div>`;
    }
    document.getElementById('report-comment').value = '';
    document.getElementById('report-modal').classList.remove('hidden');
  };

  window.closeReportModal = function() {
    document.getElementById('report-modal').classList.add('hidden');
  };

  window.submitReport = async function() {
    const payload = {
      questionId: _reportQId,
      testId,
      comment: document.getElementById('report-comment').value.trim(),
    };
    if (_reportQType === 'numerical') {
      const val = document.getElementById('report-num-val')?.value;
      payload.reportedNumericalAnswer = val !== '' ? parseFloat(val) : null;
      payload.reportedOptions = [];
    } else {
      payload.reportedOptions = [...document.querySelectorAll('.report-opt-cb:checked')].map(cb => cb.value);
      payload.reportedNumericalAnswer = null;
    }
    try {
      await API.post('/reports', payload);
      toast.success('Report submitted. Thank you!');
      closeReportModal();
    } catch { toast.error('Failed to submit report. Please try again.'); }
  };

  window.addEventListener('beforeunload', () => {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  });
});
