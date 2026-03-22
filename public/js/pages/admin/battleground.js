document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin');
  if (!user) return;

  const form = document.getElementById('post-battleground-form');
  const classInput = document.getElementById('bg-class');
  const targetSubjectInput = document.getElementById('bg-target-subject');
  const questionSubjectInput = document.getElementById('bg-question-subject');
  const chapterInput = document.getElementById('bg-chapter');
  const topicInput = document.getElementById('bg-topic');
  const questionInput = document.getElementById('bg-question');
  const dateInput = document.getElementById('bg-date');
  const submitBtn = document.getElementById('bg-submit');
  const refreshBtn = document.getElementById('bg-refresh');
  const listEl = document.getElementById('bg-list');
  const questionPreviewEl = document.getElementById('bg-question-preview');
  const questionMetaEl = document.getElementById('bg-question-meta');
  const questionImageEl = document.getElementById('bg-question-image');

  let questionsById = new Map();

  function setSelectOptions(selectEl, items, placeholder, valueKey = '_id', labelBuilder = (item) => item.name) {
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = String(item[valueKey] || '');
      option.textContent = labelBuilder(item);
      if (item.subjectKey) option.dataset.subjectKey = item.subjectKey;
      selectEl.appendChild(option);
    });
    selectEl.disabled = items.length === 0;
  }

  async function loadSubjects() {
    try {
      const subjects = await API.get('/subjects');
      const allSubjects = Array.isArray(subjects) ? subjects : [];
      setSelectOptions(questionSubjectInput, allSubjects, 'Select Subject (Schema)', '_id', (subject) => subject.name);
    } catch (error) {
      setSelectOptions(questionSubjectInput, [], 'Select Subject (Schema)');
      toast.error(error.message || 'Failed to load subjects');
    }
  }

  async function loadChapters(subjectId) {
    if (!subjectId) {
      setSelectOptions(chapterInput, [], 'Select Chapter');
      setSelectOptions(topicInput, [], 'Select Topic');
      setSelectOptions(questionInput, [], 'Select Question');
      return;
    }

    try {
      const chapters = await API.get(`/chapters/subject/${subjectId}`);
      setSelectOptions(chapterInput, Array.isArray(chapters) ? chapters : [], 'Select Chapter');
      setSelectOptions(topicInput, [], 'Select Topic');
      setSelectOptions(questionInput, [], 'Select Question');
    } catch (error) {
      setSelectOptions(chapterInput, [], 'Select Chapter');
      toast.error(error.message || 'Failed to load chapters');
    }
  }

  async function loadTopics(chapterId) {
    if (!chapterId) {
      setSelectOptions(topicInput, [], 'Select Topic');
      setSelectOptions(questionInput, [], 'Select Question');
      return;
    }

    try {
      const topics = await API.get(`/topics/chapter/${chapterId}`);
      setSelectOptions(topicInput, Array.isArray(topics) ? topics : [], 'Select Topic');
      setSelectOptions(questionInput, [], 'Select Question');
    } catch (error) {
      setSelectOptions(topicInput, [], 'Select Topic');
      toast.error(error.message || 'Failed to load topics');
    }
  }

  async function loadQuestions() {
    const subject = questionSubjectInput.value;
    const chapter = chapterInput.value;
    const topic = topicInput.value;

    if (!subject || !chapter || !topic) {
      setSelectOptions(questionInput, [], 'Select Question');
      return;
    }

    try {
      const questions = await API.get(`/questions?subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}&topic=${encodeURIComponent(topic)}`);
      questionsById = new Map((Array.isArray(questions) ? questions : []).map((question) => [String(question._id), question]));
      const items = Array.isArray(questions)
        ? questions.map((question, index) => ({
            ...question,
            name: `Q${index + 1} - ${String(question.type || '').toUpperCase()} - ${String(question._id).slice(-6)}`,
          }))
        : [];
      setSelectOptions(questionInput, items, 'Select Question');
      questionPreviewEl.classList.add('hidden');
    } catch (error) {
      setSelectOptions(questionInput, [], 'Select Question');
      questionPreviewEl.classList.add('hidden');
      toast.error(error.message || 'Failed to load questions');
    }
  }

  function renderQuestionPreview(questionId) {
    const question = questionsById.get(String(questionId || ''));
    if (!question || !question.imageUrl) {
      questionPreviewEl.classList.add('hidden');
      questionImageEl.src = '';
      questionMetaEl.textContent = '';
      return;
    }

    questionMetaEl.textContent = `Selected Question: ${question._id} | Type: ${String(question.type || '').toUpperCase()}`;
    questionImageEl.src = question.imageUrl;
    questionPreviewEl.classList.remove('hidden');
  }

  function formatDate(dateKey) {
    if (!dateKey) return '-';
    const d = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateKey;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function loadQuizzes() {
    try {
      const items = await API.get('/battlegrounds/admin/quiz');
      if (!Array.isArray(items) || !items.length) {
        listEl.innerHTML = '<div class="p-6 text-sm text-gray-500">No battleground quizzes posted yet.</div>';
        return;
      }

      listEl.innerHTML = items.map((item) => `
        <div class="px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-gray-800">${escapeHtml(item.classLevel)} · ${escapeHtml(item.subjectKey || '-')}</p>
            <p class="text-xs text-gray-500 mt-1">Date: ${formatDate(item.dateKey)} · Type: ${escapeHtml(item.questionType || '-')}</p>
            <p class="text-xs text-gray-500 mt-1">Question ID: ${escapeHtml(item.question?._id || item.question || '-')}</p>
          </div>
          <a href="${escapeHtml(item.imageUrl || '#')}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">View Image</a>
        </div>
      `).join('');
    } catch (error) {
      listEl.innerHTML = '<div class="p-6 text-sm text-red-500">Failed to load battleground quizzes.</div>';
      toast.error(error.message || 'Failed to load battleground quizzes');
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const classLevel = classInput.value.trim();
    const subjectKey = targetSubjectInput.value;
    const questionSubjectId = questionSubjectInput.value;
    const chapterId = chapterInput.value;
    const topicId = topicInput.value;
    const questionId = questionInput.value.trim();
    const date = dateInput.value;

    if (!classLevel || !subjectKey || !questionSubjectId || !chapterId || !topicId || !questionId) {
      toast.error('Class, subject, chapter, topic and question are required');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    try {
      await API.post('/battlegrounds/admin/quiz', {
        classLevel,
        subjectKey,
        questionId,
        date: date || undefined,
      });
      toast.success('Battleground quiz posted');
      form.reset();
      questionPreviewEl.classList.add('hidden');
      setSelectOptions(chapterInput, [], 'Select Chapter');
      setSelectOptions(topicInput, [], 'Select Topic');
      setSelectOptions(questionInput, [], 'Select Question');
      await loadQuizzes();
    } catch (error) {
      toast.error(error.message || 'Failed to post battleground quiz');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post';
    }
  });

  refreshBtn.addEventListener('click', loadQuizzes);

  questionSubjectInput.addEventListener('change', async () => {
    await loadChapters(questionSubjectInput.value);
  });

  chapterInput.addEventListener('change', async () => {
    await loadTopics(chapterInput.value);
  });

  topicInput.addEventListener('change', async () => {
    await loadQuestions();
  });

  questionInput.addEventListener('change', () => {
    renderQuestionPreview(questionInput.value);
  });

  await loadSubjects();
  await loadQuizzes();
});
