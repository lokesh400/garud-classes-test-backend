/**
 * pages/question-upload.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin');
  if (!user) return;

  // ── Populate dropdowns ────────────────────────────────────────────
  async function loadSubjects() {
    try {
      const subjects = await API.get('/subjects');
      const sel = document.getElementById('sel-subject');
      sel.innerHTML = '<option value="">Select Subject</option>' +
        subjects.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
    } catch { toast.error('Failed to load subjects'); }
  }

  async function loadChapters(subjectId) {
    const sel = document.getElementById('sel-chapter');
    sel.innerHTML = '<option value="">Select Chapter</option>';
    document.getElementById('sel-topic').innerHTML = '<option value="">Select Topic</option>';
    if (!subjectId) return;
    try {
      const chapters = await API.get(`/chapters/subject/${subjectId}`);
      sel.innerHTML = '<option value="">Select Chapter</option>' +
        chapters.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
    } catch { toast.error('Failed to load chapters'); }
  }

  async function loadTopics(chapterId) {
    const sel = document.getElementById('sel-topic');
    sel.innerHTML = '<option value="">Select Topic</option>';
    if (!chapterId) return;
    try {
      const topics = await API.get(`/topics/chapter/${chapterId}`);
      sel.innerHTML = '<option value="">Select Topic</option>' +
        topics.map(t => `<option value="${t._id}">${t.name}</option>`).join('');
    } catch { toast.error('Failed to load topics'); }
  }

  // ── Event listeners ───────────────────────────────────────────────
  document.getElementById('sel-subject').addEventListener('change', e => loadChapters(e.target.value));
  document.getElementById('sel-chapter').addEventListener('change', e => loadTopics(e.target.value));

  document.getElementById('sel-type').addEventListener('change', (e) => {
    const isMcq = e.target.value === 'mcq';
    document.getElementById('mcq-options').classList.toggle('hidden', !isMcq);
    document.getElementById('numerical-options').classList.toggle('hidden', isMcq);
  });

  document.getElementById('question-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById('image-preview');
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
  });

  // ── Upload ────────────────────────────────────────────────────────
  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('upload-btn');
    const file = document.getElementById('question-image').files[0];
    const subject = document.getElementById('sel-subject').value;
    const chapter = document.getElementById('sel-chapter').value;
    const topic   = document.getElementById('sel-topic').value;
    const type    = document.getElementById('sel-type').value;

    if (!file)    return toast.error('Please select a question image');
    if (!subject || !chapter || !topic) return toast.error('Select subject, chapter and topic');

    btn.disabled = true;
    btn.textContent = 'Uploading…';

    try {
      const fd = new FormData();
      fd.append('image',   file);
      fd.append('type',    type);
      fd.append('subject', subject);
      fd.append('chapter', chapter);
      fd.append('topic',   topic);

      if (type === 'mcq') {
        fd.append('correctOption', document.getElementById('sel-correct-option').value);
      } else {
        fd.append('correctNumericalAnswer', document.getElementById('inp-numerical').value);
      }

      const question = await API.postForm('/questions', fd);
      toast.success('Question uploaded!');

      // Add to recent list
      const recent = document.getElementById('recent-list');
      if (recent.querySelector('p')) recent.innerHTML = '';
      recent.insertAdjacentHTML('afterbegin', `
        <div class="flex gap-3 border border-gray-200 rounded-lg p-3">
          <img src="${question.imageUrl}" class="w-20 h-14 object-contain rounded border bg-gray-50"/>
          <div class="text-xs text-gray-600">
            <p class="font-semibold">${question.type.toUpperCase()}</p>
            <p class="text-gray-400">Correct: ${question.correctOption || question.correctNumericalAnswer}</p>
          </div>
        </div>`);

      // Reset image
      document.getElementById('question-image').value = '';
      document.getElementById('image-preview').classList.add('hidden');
      document.getElementById('inp-numerical').value = '';
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload Question';
    }
  });

  await loadSubjects();
});
