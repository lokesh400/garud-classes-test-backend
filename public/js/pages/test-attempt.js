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
    'not-visited':    'bg-[#c0c0c0] text-gray-700',
    'not-answered':   'bg-[#e74c3c] text-white',
    'answered':       'bg-[#27ae60] text-white',
    'marked':         'bg-[#8e44ad] text-white',
    'answered-marked':'bg-[#8e44ad] text-white ring-2 ring-[#27ae60] ring-offset-1',
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

      // Fullscreen
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

    // Section tabs
    const tabsEl = document.getElementById('section-tabs');
    tabsEl.innerHTML = test.sections.map((s, i) => `
      <button id="tab-${i}" onclick="switchSection(${i})"
              class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition
                     ${i === 0 ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
        ${s.name}
      </button>`).join('');
  }

  // ── Navigation ────────────────────────────────────────────────────
  function navigateTo(secIdx, qIdx) {
    currentSection  = secIdx;
    currentQuestion = qIdx;
    const sec   = test.sections[secIdx];
    const qEntry = sec?.questions[qIdx];
    if (!qEntry) return;

    const key = `${sec._id}_${qEntry.question._id}`;
    visited[key] = true;

    renderQuestion(sec, qEntry, key);
    renderPalette(false);
    renderPalette(true);
    updateSectionTabs();
  }

  window.switchSection = function(idx) {
    navigateTo(idx, 0);
  };

  function updateSectionTabs() {
    test.sections.forEach((_, i) => {
      const btn = document.getElementById(`tab-${i}`);
      if (!btn) return;
      btn.className = `px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
        i === currentSection
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`;
    });
  }

  // ── Render question ───────────────────────────────────────────────
  function renderQuestion(sec, qEntry, key) {
    const q    = qEntry.question;
    const ans  = answers[key];
    const isMcq = q.type === 'mcq';

    document.getElementById('q-number').textContent =
      `Q ${currentQuestion + 1} of ${sec.questions.length}`;
    document.getElementById('q-type').textContent   = q.type.toUpperCase();
    document.getElementById('q-image').src          = q.imageUrl;

    // MCQ / Numerical toggle
    document.getElementById('mcq-options').classList.toggle('hidden', !isMcq);
    document.getElementById('num-input').classList.toggle('hidden', isMcq);

    if (isMcq) {
      const opts = ['A','B','C','D'];
      document.getElementById('option-buttons').innerHTML = opts.map(opt => {
        const selected = ans?.selectedOption === opt;
        return `
          <button onclick="selectMcq('${opt}')"
                  class="flex items-center gap-2 px-4 py-3 rounded-lg border-2 font-medium text-sm transition
                         ${selected ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-700 hover:border-blue-300'}">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                         ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}">
              ${opt}
            </span>
            Option ${opt}
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
    delete reviewed[key]; // unmark review if was marked
    goNext();
  };

  window.handleMarkAndNext = function() {
    const { sec, qEntry, key } = getCurrentAnswer();
    reviewed[key] = true;
    saveAnswer(sec, qEntry, key);
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
  };

  window.handlePrev = function() {
    getCurrentAnswer(); // persist numerical input
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
      if (st === 'answered')        answered++;
      else if (st === 'not-answered')  notAnswered++;
      else if (st === 'marked')        marked++;
      else if (st === 'answered-marked') answeredMarked++;
      else                             notVisited++;
    }));

    stats.innerHTML = `
      <div class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-[#27ae60] inline-block"></span>${answered} Answered</div>
      <div class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-[#e74c3c] inline-block"></span>${notAnswered} Not Answered</div>
      <div class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-[#8e44ad] inline-block"></span>${marked} Marked</div>
      <div class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-[#c0c0c0] inline-block"></span>${notVisited} Not Visited</div>`;
  }

  // ── Palette toggle (mobile) ───────────────────────────────────────
  window.togglePalette = function() {
    const overlay = document.getElementById('palette-overlay');
    const panel   = document.getElementById('palette-mobile');
    overlay.classList.toggle('hidden');
    panel.classList.toggle('hidden');
  };

  // Navigate to question from palette
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
    el.className   = `font-mono font-bold text-lg px-3 py-1 rounded-lg ${
      timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-800'
    }`;
  }

  // ── Submit ────────────────────────────────────────────────────────
  window.handleSubmit = function() {
    if (!confirm('Are you sure you want to submit the test? You cannot change answers after submission.')) return;
    submitTest(false);
  };

  async function submitTest(auto) {
    if (timerInterval) clearInterval(timerInterval);
    try {
      await API.post(`/tests/${testId}/submit`);
      toast.success(auto ? 'Time up! Test auto-submitted.' : 'Test submitted successfully!');
      // Exit fullscreen
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      window.location.href = `/student/results/${testId}`;
    } catch { toast.error('Failed to submit test'); }
  }

  await startTest();

  // Exit fullscreen on unload
  window.addEventListener('beforeunload', () => {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  });
});
