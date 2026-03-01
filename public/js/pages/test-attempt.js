/**
 * pages/test-attempt.js — NTA-style test interface
 * Depends on: api.js, toast.js, auth-guard.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  const testId = window.location.pathname.split('/')[3]; // /student/test/:testId

  let test    = null;
  let attempt = null;
  let timeLeft = 0;
  let timerInterval = null;

  let currentSection  = 0;
  let currentQuestion = 0;

  // answers   : { `${secId}_${qId}` : { selectedOption, numericalAnswer } }
  // visited   : { key: true }
  // reviewed  : { key: true }
  const answers  = {};
  const visited  = {};
  const reviewed = {};

  // ── Status logic ──────────────────────────────────────────────────
  function getStatus(key) {
    const ans = answers[key];
    const isAnswered = ans?.selectedOption != null ||
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
      const res = await API.post(`/tests/${testId}/start`);
      test    = res.test;
      attempt = res.attempt;

      const startedAt = new Date(attempt.startedAt).getTime();
      const duration  = test.duration * 60;
      const elapsed   = Math.floor((Date.now() - startedAt) / 1000);
      timeLeft        = Math.max(0, duration - elapsed);

      // Restore saved answers
      if (attempt.answers) {
        attempt.answers.forEach(a => {
          const key = `${a.sectionId}_${a.question}`;
          answers[key] = { selectedOption: a.selectedOption, numericalAnswer: a.numericalAnswer };
          visited[key] = true;
        });
      }

      initUI();
      startTimer();
      navigateTo(0, 0);

      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already submitted')) {
        toast.error('You have already submitted this test');
        window.location.href = `/student/results/${testId}`;
      } else {
        toast.error(msg || 'Failed to start test');
        window.location.href = '/student/dashboard';
      }
    } finally {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('test-ui').classList.remove('hidden');
    }
  }

  // ── UI initialisation ─────────────────────────────────────────────
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
                       ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
          ${s.name}
          <span class="text-xs ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'} rounded-full px-1.5 py-0.5 font-semibold">
            ${answered}/${s.questions.length}
          </span>
        </button>`;
    }).join('');
  }

  // ── Navigation ────────────────────────────────────────────────────
  function navigateTo(secIdx, qIdx) {
    currentSection  = secIdx;
    currentQuestion = qIdx;
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
    const q    = qEntry.question;
    const ans  = answers[key];
    const isMcq = q.type === 'mcq';

    // Number + type
    document.getElementById('q-number').textContent =
      `Q ${currentQuestion + 1} / ${sec.questions.length}`;
    document.getElementById('q-type').textContent = q.type.toUpperCase();

    // Marks badge
    const marksEl = document.getElementById('q-marks');
    marksEl.innerHTML = `
      <span class="bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">
        +${qEntry.positiveMarks}
      </span>
      <span class="bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
        −${qEntry.negativeMarks}
      </span>`;

    // Image
    const imgEl = document.getElementById('q-image');
    imgEl.src = q.imageUrl || '';
    imgEl.style.display = q.imageUrl ? 'block' : 'none';

    // MCQ / Numerical toggle
    document.getElementById('mcq-options').classList.toggle('hidden', !isMcq);
    document.getElementById('num-input').classList.toggle('hidden', isMcq);

    if (isMcq) {
      const opts = ['A', 'B', 'C', 'D'];
      document.getElementById('option-buttons').innerHTML = opts.map(opt => {
        const selected = ans?.selectedOption === opt;
        return `
          <button onclick="selectMcq('${opt}')"
                  class="flex items-center gap-3 px-4 py-4 rounded-xl border-2 font-medium text-sm transition w-full text-left
                         ${selected
                           ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                           : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-gray-50'}">
            <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                         ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}">
              ${opt}
            </span>
            <span>Option ${opt}</span>
          </button>`;
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
    answers[key] = { selectedOption: opt, numericalAnswer: null };
    renderQuestion(sec, qEntry, key);
    renderPalette(false);
    renderPalette(true);
  };

  // ── Save answer from current state ───────────────────────────────
  function getCurrentAnswer() {
    const sec    = test.sections[currentSection];
    const qEntry = sec.questions[currentQuestion];
    const key    = `${sec._id}_${qEntry.question._id}`;
    const q      = qEntry.question;

    if (q.type === 'numerical') {
      const val = document.getElementById('numerical-answer').value;
      answers[key] = {
        selectedOption: null,
        numericalAnswer: val !== '' ? parseFloat(val) : null,
      };
    }
    return { sec, qEntry, key };
  }

  async function saveAnswer(sec, qEntry, key) {
    const ans = answers[key];
    if (!ans) return;
    try {
      await API.post(`/tests/${testId}/answer`, {
        questionId: qEntry.question._id,
        sectionId:  sec._id,
        ...ans,
      });
    } catch { /* silently ignore auto-save failures */ }
  }

  // ── NTA button handlers ───────────────────────────────────────────
  window.handleSaveAndNext = function() {
    const { sec, qEntry, key } = getCurrentAnswer();
    saveAnswer(sec, qEntry, key);
    delete reviewed[key];
    renderSectionTabs();
    goNext();
  };

  window.handleMarkAndNext = function() {
    const { sec, qEntry, key } = getCurrentAnswer();
    reviewed[key] = true;
    saveAnswer(sec, qEntry, key);
    renderSectionTabs();
    goNext();
  };

  window.handleClearAnswer = function() {
    const sec    = test.sections[currentSection];
    const qEntry = sec.questions[currentQuestion];
    const key    = `${sec._id}_${qEntry.question._id}`;
    answers[key] = { selectedOption: null, numericalAnswer: null };
    delete reviewed[key];
    saveAnswer(sec, qEntry, key);
    renderQuestion(sec, qEntry, key);
    renderPalette(false);
    renderPalette(true);
    renderSectionTabs();
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
                title="Question ${qi + 1}"
                class="w-8 h-8 rounded text-xs font-bold transition
                       ${statusClass[st]}
                       ${isActive ? 'ring-2 ring-blue-400 ring-offset-1 scale-110' : 'hover:scale-105'}">
          ${qi + 1}
        </button>`;
    }).join('');

    // Stats
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

  // ── Palette toggle (mobile) ───────────────────────────────────────
  window.togglePalette = function() {
    const overlay = document.getElementById('palette-overlay');
    const panel   = document.getElementById('palette-mobile');
    overlay.classList.toggle('hidden');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      renderPalette(true);
    }
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
    // Tally counts for modal
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
    try {
      await API.post(`/tests/${testId}/submit`);
      toast.success(auto ? 'Time up! Test auto-submitted.' : 'Test submitted successfully!');
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      window.location.href = `/student/results/${testId}`;
    } catch { toast.error('Failed to submit test'); }
  }

  await startTest();

  window.addEventListener('beforeunload', () => {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  });
});
