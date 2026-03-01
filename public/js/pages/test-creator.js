/**
 * pages/test-creator.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin');
  if (!user) return;

  const testId = window.location.pathname.split('/')[3]; // /admin/tests/:testId
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
    const params  = {};
    if (subject) params.subject = subject;
    if (chapter) params.chapter = chapter;
    if (topic)   params.topic   = topic;
    allQuestions = await API.get('/questions', params);
    renderQuestionGrid();
  }

  // ── Render ────────────────────────────────────────────────────────
  function renderTest() {
    document.getElementById('test-title').textContent = test.name;
    const total = test.sections.reduce((a, s) => a + s.questions.length, 0);
    document.getElementById('test-meta').textContent = `Duration: ${test.duration} min | ${total} questions total`;

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
          ${s.questions.map((q, qi) => `
            <div class="relative border border-gray-200 rounded-lg overflow-hidden group">
              <img src="${q.question.imageUrl}" alt="Q${qi+1}"
                   class="w-full h-28 object-contain bg-gray-50"/>
              <div class="p-2 text-xs text-gray-500 flex justify-between">
                <span>${q.question.type.toUpperCase()}</span>
                <span>+${q.positiveMarks}/-${q.negativeMarks}</span>
              </div>
              <button onclick="removeQuestion('${s._id}', '${q._id}')"
                      class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">✕</button>
            </div>`).join('')}
          ${!s.questions.length ? '<p class="col-span-full text-sm text-gray-400">No questions in this section.</p>' : ''}
        </div>
      </div>`).join('');
  }

  function renderQuestionGrid() {
    const grid = document.getElementById('question-grid');
    if (!allQuestions.length) {
      grid.innerHTML = '<p class="col-span-full text-sm text-gray-400">No questions found for this filter.</p>';
      return;
    }
    grid.innerHTML = allQuestions.map(q => {
      const inTest = isInTest(q._id);
      return `
        <div class="relative border-2 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition
                    ${inTest ? 'border-green-400 opacity-60' : 'border-gray-200 hover:border-garud-highlight'}"
             onclick="${inTest ? '' : `pickQuestion('${q._id}')`}">
          <img src="${q.imageUrl}" alt="" class="w-full h-24 object-contain bg-gray-50"/>
          <div class="p-2 text-xs text-gray-500 flex justify-between">
            <span>${q.type.toUpperCase()}</span>
            ${inTest ? '<span class="text-green-600 font-bold">✓ Added</span>' : ''}
          </div>
        </div>`;
    }).join('');
  }

  function isInTest(qId) {
    if (!test) return false;
    return test.sections.some(s => s.questions.some(q => q.question._id === qId));
  }

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
    const nm = parseFloat(document.getElementById('negative-marks').value) || 1;
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

  await fetchAll();
});
