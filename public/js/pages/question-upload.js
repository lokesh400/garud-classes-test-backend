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

  document.getElementById('sel-subject').addEventListener('change', e => loadChapters(e.target.value));
  document.getElementById('sel-chapter').addEventListener('change', e => loadTopics(e.target.value));

  // Paste-mode type toggle
  document.getElementById('sel-type').addEventListener('change', (e) => {
    const isMcq = e.target.value === 'mcq';
    document.getElementById('mcq-options').classList.toggle('hidden', !isMcq);
    document.getElementById('numerical-options').classList.toggle('hidden', isMcq);
  });

  // ── Filename parser ───────────────────────────────────────────────
  // Format: "{qNum}-{answer}.ext"
  //   answer = A/B/C/D  → MCQ
  //   answer = number   → Numerical
  function parseFilename(filename) {
    const base   = filename.replace(/\.[^/.]+$/, '').trim(); // strip extension
    const dashIdx = base.indexOf('-');
    if (dashIdx === -1) return null;
    const qNum  = base.slice(0, dashIdx).trim();
    const answer = base.slice(dashIdx + 1).trim();
    if (!answer) return null;
    if (/^[A-Da-d]$/.test(answer)) {
      return { qNum, type: 'mcq', correctOption: answer.toUpperCase() };
    }
    const num = parseFloat(answer);
    if (!isNaN(num)) {
      return { qNum, type: 'numerical', correctNumericalAnswer: num };
    }
    return null; // unrecognised format
  }

  // ── Tab switching ─────────────────────────────────────────────────
  let pastedFile = null;
  let imageTab   = 'file';

  window.setImageTab = function(tab) {
    imageTab = tab;
    document.getElementById('zone-file')           .classList.toggle('hidden', tab !== 'file');
    document.getElementById('zone-paste')          .classList.toggle('hidden', tab !== 'paste');
    document.getElementById('manual-answer-fields').classList.toggle('hidden', tab !== 'paste');
    document.getElementById('tab-file') .className = `flex-1 py-1.5 transition ${tab === 'file'  ? 'bg-garud-accent text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`;
    document.getElementById('tab-paste').className = `flex-1 py-1.5 transition ${tab === 'paste' ? 'bg-garud-accent text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`;
    updateSubmitBtn();
    if (tab === 'paste') document.getElementById('paste-zone').focus();
  };

  function updateSubmitBtn() {
    const btn   = document.getElementById('upload-btn');
    if (imageTab === 'file') {
      const files = document.getElementById('question-image').files;
      const valid = Array.from(files).filter(f => parseFilename(f.name)).length;
      btn.textContent = valid > 1 ? `Upload ${valid} Questions` : 'Upload Question';
    } else {
      btn.textContent = 'Upload Question';
    }
  }

  // ── File list preview (multi-file mode) ───────────────────────────
  document.getElementById('question-image').addEventListener('change', () => {
    pastedFile = null;
    renderFileList();
    updateSubmitBtn();
  });

  function renderFileList() {
    const files  = Array.from(document.getElementById('question-image').files);
    const listEl = document.getElementById('file-list-preview');
    if (!files.length) { listEl.innerHTML = ''; return; }

    listEl.innerHTML = files.map((f, i) => {
      const parsed = parseFilename(f.name);
      if (parsed) {
        const badge = parsed.type === 'mcq'
          ? `<span class="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">MCQ · ${parsed.correctOption}</span>`
          : `<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">Numerical · ${parsed.correctNumericalAnswer}</span>`;
        return `
          <div class="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs">
            <span class="text-green-500 font-bold flex-shrink-0">&#x2713;</span>
            <span class="text-gray-700 truncate flex-1" title="${f.name}">${f.name}</span>
            ${badge}
          </div>`;
      } else {
        return `
          <div class="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs">
            <span class="text-red-400 font-bold flex-shrink-0">&#x2717;</span>
            <span class="text-gray-500 truncate flex-1" title="${f.name}">${f.name}</span>
            <span class="text-red-400 flex-shrink-0">Unrecognised format — will skip</span>
          </div>`;
      }
    }).join('');
  }

  // ── Paste from clipboard ──────────────────────────────────────────
  function showPastePreview(src, name) {
    const preview = document.getElementById('image-preview');
    preview.src = src;
    preview.classList.remove('hidden');
    const fn = document.getElementById('paste-filename');
    if (name) { fn.textContent = name; fn.classList.remove('hidden'); }
    else fn.classList.add('hidden');
  }

  document.getElementById('paste-zone').addEventListener('paste', handlePaste);
  document.addEventListener('paste', (e) => { if (imageTab === 'paste') handlePaste(e); });

  function handlePaste(e) {
    const items = (e.clipboardData || window.clipboardData)?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        pastedFile = new File([blob], `pasted-${Date.now()}.png`, { type: blob.type });
        showPastePreview(URL.createObjectURL(blob), pastedFile.name);
        document.getElementById('paste-zone').innerHTML =
          `<span class="text-2xl">&#x2705;</span>
           <span class="text-sm text-green-600 font-medium mt-1">Image pasted! Ready to upload.</span>
           <span class="text-xs text-gray-400 mt-0.5">Paste again to replace</span>`;
        return;
      }
    }
    toast.error('No image found in clipboard. Copy an image first.');
  }

  // ── Upload helper for one file ────────────────────────────────────
  async function uploadOne(file, parsed, subject, chapter, topic) {
    const fd = new FormData();
    fd.append('image',   file);
    fd.append('type',    parsed.type);
    fd.append('subject', subject);
    fd.append('chapter', chapter);
    fd.append('topic',   topic);
    if (parsed.type === 'mcq') {
      fd.append('correctOption', parsed.correctOption);
    } else {
      fd.append('correctNumericalAnswer', parsed.correctNumericalAnswer);
    }
    return API.postForm('/questions', fd);
  }

  function addToRecentList(question) {
    const recent = document.getElementById('recent-list');
    if (recent.querySelector('p')) recent.innerHTML = '';
    recent.insertAdjacentHTML('afterbegin', `
      <div class="flex gap-3 border border-gray-200 rounded-lg p-3">
        <img src="${question.imageUrl}" class="w-20 h-14 object-contain rounded border bg-gray-50"/>
        <div class="text-xs text-gray-600">
          <p class="font-semibold">${question.type.toUpperCase()}</p>
          <p class="text-gray-400">Correct: ${question.correctOption ?? question.correctNumericalAnswer}</p>
        </div>
      </div>`);
  }

  // ── Form submit ───────────────────────────────────────────────────
  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn     = document.getElementById('upload-btn');
    const subject = document.getElementById('sel-subject').value;
    const chapter = document.getElementById('sel-chapter').value;
    const topic   = document.getElementById('sel-topic').value;
    if (!subject || !chapter || !topic) return toast.error('Select subject, chapter and topic');

    // ── Paste mode: single upload ──────────────────────────────────
    if (imageTab === 'paste') {
      if (!pastedFile) return toast.error('Please paste an image first');
      const type = document.getElementById('sel-type').value;
      btn.disabled = true; btn.textContent = 'Uploading…';
      try {
        const parsed = {
          type,
          correctOption:         type === 'mcq' ? document.getElementById('sel-correct-option').value : undefined,
          correctNumericalAnswer: type === 'numerical' ? parseFloat(document.getElementById('inp-numerical').value) : undefined,
        };
        const question = await uploadOne(pastedFile, parsed, subject, chapter, topic);
        toast.success('Question uploaded!');
        addToRecentList(question);
        // Reset paste
        pastedFile = null;
        document.getElementById('image-preview').classList.add('hidden');
        document.getElementById('paste-filename').classList.add('hidden');
        document.getElementById('inp-numerical').value = '';
        document.getElementById('paste-zone').innerHTML =
          `<span class="text-3xl mb-2">&#x1F4CB;</span>
           <span class="text-sm text-gray-500">Click here, then <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Ctrl+V</kbd> to paste</span>
           <span class="text-xs text-gray-400 mt-1">Works with screenshots &amp; copied images</span>`;
      } catch (err) {
        toast.error(err.message || 'Upload failed');
      } finally {
        btn.disabled = false; btn.textContent = 'Upload Question';
      }
      return;
    }

    // ── File mode: multi-file sequential upload ────────────────────
    const files      = Array.from(document.getElementById('question-image').files);
    const validFiles = files.map(f => ({ file: f, parsed: parseFilename(f.name) })).filter(x => x.parsed);

    if (!validFiles.length) return toast.error('No valid files. Check filename format (e.g. 1-A.jpg or 1-120.jpg)');

    btn.disabled = true;
    let done = 0, failed = 0;

    for (const { file, parsed } of validFiles) {
      btn.textContent = `Uploading ${done + 1} / ${validFiles.length}…`;
      try {
        const question = await uploadOne(file, parsed, subject, chapter, topic);
        addToRecentList(question);
        done++;
      } catch (err) {
        failed++;
        console.error(`Failed: ${file.name}`, err.message);
      }
    }

    // Reset
    document.getElementById('question-image').value = '';
    document.getElementById('file-list-preview').innerHTML = '';
    btn.disabled = false;
    btn.textContent = 'Upload Question';

    if (failed === 0) {
      toast.success(`${done} question${done !== 1 ? 's' : ''} uploaded successfully!`);
    } else {
      toast.error(`${done} uploaded, ${failed} failed. Check console for details.`);
    }
  });

  await loadSubjects();
});
