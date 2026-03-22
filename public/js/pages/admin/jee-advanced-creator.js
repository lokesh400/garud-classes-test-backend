/**
 * pages/jee-advanced-creator.js
 * JEE Advanced test creator — supports MCQ, MSQ, and Numerical question types.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin');
  if (!user) return;

  // URL: /admin/jee-advanced-tests/:testId
  const testId = window.location.pathname.split('/')[3];
  let test = null;
  let allQuestions = [];
  let allSubjects  = [];
  let allChapters  = [];
  let allTopics    = [];
  let activeSectionId = null;

  // ── Load data ─────────────────────────────────────────────────────
  async function fetchAll() {
    try {
      const [t, s] = await Promise.all([
        API.get(`/tests/admin/${testId}`),
        API.get('/subjects'),
      ]);
      test = t;
      allSubjects = s;
      renderTest();
      populateSubjectFilter();
      populateSettings();
    } catch {
      toast.error('Failed to load test');
      window.location.href = '/admin/tests';
    } finally {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('main-content').classList.remove('hidden');
    }
  }

  async function fetchQuestions() {
    const subject = document.getElementById('f-subject').value;
    const chapter = document.getElementById('f-chapter').value;
    const topic   = document.getElementById('f-topic').value;
    const type    = document.getElementById('f-type').value;
    const params  = {};
    if (subject) params.subject = subject;
    if (chapter) params.chapter = chapter;
    if (topic)   params.topic   = topic;
    if (type)    params.type    = type;

    const loadingEl = document.getElementById('picker-loading');
    const gridEl    = document.getElementById('question-grid');
    loadingEl.classList.remove('hidden');
    loadingEl.classList.add('flex');
    gridEl.classList.add('hidden');

    try {
      allQuestions = await API.get('/questions', params);
    } catch {
      allQuestions = [];
      toast.error('Failed to load questions');
    } finally {
      loadingEl.classList.add('hidden');
      loadingEl.classList.remove('flex');
      gridEl.classList.remove('hidden');
    }
    renderQuestionGrid();
  }

  // ── Render ────────────────────────────────────────────────────────
  function renderTest() {
    document.getElementById('test-title').textContent = test.name;
    const total = test.sections.reduce((a, s) => a + s.questions.length, 0);
    const modeLabel = test.mode === 'practice' ? '🔁 Practice' : '🎯 Real';
    const schedLabel = test.scheduledAt
      ? `📅 ${new Date(test.scheduledAt).toLocaleString()}`
      : '📅 No schedule set';
    document.getElementById('test-meta').textContent =
      `Duration: ${test.duration} min | ${total} questions total | ${modeLabel} | ${schedLabel}`;

    const container = document.getElementById('sections-container');
    if (!test.sections.length) {
      container.innerHTML = '<div class="bg-white rounded-xl shadow-md p-8 text-center text-gray-400">No sections yet. Add a section above.</div>';
      return;
    }

    container.innerHTML = test.sections.map(s => `
      <div class="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
        <div class="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
          <h3 class="font-bold text-gray-800">${s.name} <span class="text-gray-400 font-normal text-sm">(${s.questions.length} questions)</span></h3>
          <div class="flex gap-2">
            <button onclick="openPicker('${s._id}')"
                    class="flex items-center gap-1 px-3 py-1 text-sm border border-garud-highlight text-garud-highlight rounded-lg hover:bg-gray-100 transition">
              + Add Questions
            </button>
            <button onclick="removeSection('${s._id}')"
                    class="px-3 py-1 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">Remove</button>
          </div>
        </div>
        <div class="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          ${s.questions.map((q, qi) => {
            const typeBadgeColor = q.question.type === 'msq'
              ? 'text-orange-700 bg-orange-50'
              : q.question.type === 'numerical'
              ? 'text-blue-700 bg-blue-50'
              : 'text-purple-700 bg-purple-50';
            return `
            <div class="relative border border-gray-200 rounded-lg overflow-hidden group">
              <img src="${q.question.imageUrl}" alt="Q${qi+1}"
                   class="w-full h-28 object-contain bg-gray-50"/>
              <div class="p-2 text-xs flex justify-between items-center">
                <span class="px-1.5 py-0.5 rounded font-semibold ${typeBadgeColor}">${q.question.type.toUpperCase()}</span>
                <span class="text-gray-500">+${q.positiveMarks}/-${q.negativeMarks}</span>
              </div>
              <button onclick="removeQuestion('${s._id}', '${q._id}')"
                      class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">✕</button>
            </div>`;
          }).join('')}
          ${!s.questions.length ? '<p class="col-span-full text-sm text-gray-400">No questions in this section.</p>' : ''}
        </div>
      </div>`).join('');
  }

  function renderQuestionGrid() {
    const grid = document.getElementById('question-grid');
    if (!allQuestions.length) {
      grid.innerHTML = '<p class="col-span-full text-center text-sm text-gray-400 py-8">No questions found for this filter.</p>';
      return;
    }

    grid.innerHTML = allQuestions.map((q, idx) => {
      const inTest = isInTest(q._id);
      const typeBadgeColor = q.type === 'msq'
        ? 'bg-orange-100 text-orange-700'
        : q.type === 'numerical'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-purple-100 text-purple-700';
      return `
        <div class="relative border-2 rounded-xl cursor-pointer transition-all
                    ${inTest ? 'border-green-400' : 'border-gray-200 hover:border-garud-highlight hover:shadow-md'}"
             data-qid="${q._id}"
             onclick="${inTest ? '' : `pickQuestion('${q._id}')`}"
             title="${inTest ? 'Already added' : 'Click to add'}">
          <img src="${q.imageUrl}"
               alt="Q${idx + 1}"
               class="w-full h-52 object-contain bg-gray-50 block"/>
          <div class="px-2 py-1.5 text-xs flex justify-between items-center bg-white border-t border-gray-100">
            <span class="px-1.5 py-0.5 rounded font-semibold ${typeBadgeColor}">${(q.type || '').toUpperCase()}</span>
            ${inTest
              ? '<span class="text-green-600 font-bold">&#10003; Added</span>'
              : `<span class="text-gray-400">Q${idx + 1}</span>`}
          </div>
          ${inTest ? '<div class="absolute inset-0 bg-green-500/10 pointer-events-none"></div>' : ''}
        </div>`;
    }).join('');
  }

  function isInTest(qId) {
    if (!test) return false;
    return test.sections.some(s => s.questions.some(q => q.question._id === qId));
  }

  // ── Settings panel ────────────────────────────────────────────────
  function populateSettings() {
    if (test.scheduledAt) {
      const d = new Date(test.scheduledAt);
      const pad = n => String(n).padStart(2, '0');
      const local = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      document.getElementById('setting-scheduled-at').value = local;
    }
    if (test.mode) document.getElementById('setting-mode').value = test.mode;
    if (test.syllabus) document.getElementById('setting-syllabus').value = test.syllabus;
  }

  window.toggleSettings = function() {
    const panel = document.getElementById('settings-panel');
    const arrow = document.getElementById('settings-arrow');
    const hidden = panel.classList.toggle('hidden');
    arrow.style.transform = hidden ? '' : 'rotate(90deg)';
  };

  window.saveSettings = async function() {
    const scheduledVal = document.getElementById('setting-scheduled-at').value;
    const mode         = document.getElementById('setting-mode').value;
    const syllabus     = document.getElementById('setting-syllabus').value.trim();
    try {
      test = await API.put(`/tests/${testId}`, {
        name:        test.name,
        description: test.description,
        duration:    test.duration,
        isPublished: test.isPublished,
        scheduledAt: scheduledVal ? new Date(scheduledVal).toISOString() : null,
        mode,
        syllabus,
        testType: 'jee-advanced',
      });
      toast.success('Settings saved!');
      renderTest();
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    }
  };

  // ── Section actions ───────────────────────────────────────────────
  window.addSection = async function() {
    const name = document.getElementById('new-section-name').value.trim();
    if (!name) return;
    try {
      test = await API.post(`/tests/${testId}/sections`, { name });
      document.getElementById('new-section-name').value = '';
      renderTest();
      toast.success('Section added!');
    } catch { toast.error('Failed to add section'); }
  };

  window.removeSection = async function(sectionId) {
    if (!confirm('Remove this section?')) return;
    try {
      test = await API.delete(`/tests/${testId}/sections/${sectionId}`);
      renderTest();
      toast.success('Section removed');
    } catch { toast.error('Failed to remove section'); }
  };

  // ── Picker ────────────────────────────────────────────────────────
  window.openPicker = async function(sectionId) {
    activeSectionId = sectionId;
    document.getElementById('picker-modal').classList.remove('hidden');
    await fetchQuestions();
  };

  window.closePicker = function() {
    document.getElementById('picker-modal').classList.add('hidden');
    activeSectionId = null;
  };

  window.pickQuestion = async function(qId) {
    const pm = parseFloat(document.getElementById('positive-marks').value) || 4;

    // Determine negativeMarks based on the question's type
    const qObj  = allQuestions.find(q => String(q._id) === String(qId));
    const qType = qObj?.type;
    let nm;
    if (qType === 'numerical') {
      nm = 0;  // JEE Advanced integer/numerical: no negative marks for wrong
    } else if (qType === 'msq') {
      nm = parseFloat(document.getElementById('negative-marks-msq').value) || 2;
    } else {
      nm = parseFloat(document.getElementById('negative-marks').value) || 1;  // MCQ default
    }

    try {
      test = await API.post(`/tests/${testId}/sections/${activeSectionId}/questions`, {
        questionId: qId,
        positiveMarks: pm,
        negativeMarks: nm,
      });
      renderTest();
      renderQuestionGrid();
      toast.success('Question added!');
    } catch (err) { toast.error(err.message || 'Failed to add question'); }
  };

  window.removeQuestion = async function(sectionId, entryId) {
    try {
      test = await API.delete(`/tests/${testId}/sections/${sectionId}/questions/${entryId}`);
      renderTest();
      toast.success('Question removed');
    } catch { toast.error('Failed to remove question'); }
  };

  // ── Filter handlers ───────────────────────────────────────────────
  function populateSubjectFilter() {
    const sel = document.getElementById('f-subject');
    sel.innerHTML = '<option value="">All Subjects</option>' +
      allSubjects.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
  }

  document.getElementById('f-subject').addEventListener('change', async (e) => {
    const subjectId = e.target.value;
    document.getElementById('f-chapter').innerHTML = '<option value="">All Chapters</option>';
    document.getElementById('f-topic').innerHTML   = '<option value="">All Topics</option>';
    if (subjectId) {
      allChapters = await API.get(`/chapters/subject/${subjectId}`);
      document.getElementById('f-chapter').innerHTML = '<option value="">All Chapters</option>' +
        allChapters.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
    }
    fetchQuestions();
  });

  document.getElementById('f-chapter').addEventListener('change', async (e) => {
    const chapterId = e.target.value;
    document.getElementById('f-topic').innerHTML = '<option value="">All Topics</option>';
    if (chapterId) {
      allTopics = await API.get(`/topics/chapter/${chapterId}`);
      document.getElementById('f-topic').innerHTML = '<option value="">All Topics</option>' +
        allTopics.map(t => `<option value="${t._id}">${t.name}</option>`).join('');
    }
    fetchQuestions();
  });

  document.getElementById('f-topic').addEventListener('change', fetchQuestions);
  document.getElementById('f-type').addEventListener('change', fetchQuestions);

  await fetchAll();
});
