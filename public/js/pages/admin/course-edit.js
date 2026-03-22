document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin');
  if (!user) return;

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const courseId = pathParts[2];

  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const editorState = document.getElementById('editor-state');

  const pageTitle = document.getElementById('page-title');
  const deleteBtn = document.getElementById('delete-course-btn');
  const form = document.getElementById('edit-course-form');
  const saveBtn = document.getElementById('save-course-btn');
  const addLectureRowBtn = document.getElementById('add-lecture-row');
  const lectureRows = document.getElementById('lecture-rows');

  const nameInput = document.getElementById('course-name');
  const descriptionInput = document.getElementById('course-description');
  const priceInput = document.getElementById('course-price');
  const madeForInput = document.getElementById('course-made-for');
  const imageInput = document.getElementById('course-image');
  const tagsInput = document.getElementById('course-tags');
  const publishedInput = document.getElementById('course-published');

  const metaLectures = document.getElementById('meta-lectures');
  const metaPurchases = document.getElementById('meta-purchases');
  const metaCreatedBy = document.getElementById('meta-created-by');
  const metaUpdatedAt = document.getElementById('meta-updated-at');

  let currentCourse = null;

  function setLoading(isLoading) {
    loadingState.classList.toggle('hidden', !isLoading);
  }

  function showError(message) {
    setLoading(false);
    editorState.classList.add('hidden');
    errorState.classList.remove('hidden');
    errorState.textContent = message;
  }

  function showEditor() {
    setLoading(false);
    errorState.classList.add('hidden');
    editorState.classList.remove('hidden');
  }

  function formatDate(dateValue) {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  function addPdfRow(pdfRows, initial = {}) {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-2';
    row.innerHTML = `
      <input type="text" class="pdf-title px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="PDF title" value="${escapeHtml(initial.title || '')}" />
      <input type="url" class="pdf-link px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://zenodo.org/..." value="${escapeHtml(initial.link || '')}" />
      <button type="button" class="remove-pdf-row px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50">Remove</button>
    `;

    row.querySelector('.remove-pdf-row').addEventListener('click', () => {
      row.remove();
    });

    pdfRows.appendChild(row);
  }

  function addLectureRow(initial = {}) {
    const row = document.createElement('div');
    row.className = 'rounded-xl border border-gray-200 bg-white p-3 space-y-3';
    row.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-2">
        <input type="text" class="lecture-title px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Lecture title" value="${escapeHtml(initial.title || '')}" />
        <input type="url" class="lecture-link px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://video-link" value="${escapeHtml(initial.videoLink || '')}" />
        <button type="button" class="remove-lecture-row px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50">Remove Lecture</button>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-semibold text-slate-700">Lecture PDFs</p>
          <button type="button" class="add-pdf-row px-2 py-1 rounded-md bg-slate-700 text-white text-xs">+ Add PDF</button>
        </div>
        <div class="pdf-rows space-y-2"></div>
      </div>
    `;

    const pdfRows = row.querySelector('.pdf-rows');
    const pdfs = Array.isArray(initial.pdfs) ? initial.pdfs : [];
    pdfs.forEach((pdf) => addPdfRow(pdfRows, pdf));

    row.querySelector('.add-pdf-row').addEventListener('click', () => addPdfRow(pdfRows));

    row.querySelector('.remove-lecture-row').addEventListener('click', () => {
      row.remove();
      if (!lectureRows.children.length) addLectureRow();
    });

    lectureRows.appendChild(row);
  }

  function collectLectures() {
    return Array.from(lectureRows.querySelectorAll(':scope > div')).map((lectureEl) => {
      const pdfs = Array.from(lectureEl.querySelectorAll('.pdf-rows > div'))
        .map((pdfEl) => ({
          title: pdfEl.querySelector('.pdf-title')?.value.trim() || '',
          link: pdfEl.querySelector('.pdf-link')?.value.trim() || '',
        }))
        .filter((pdf) => pdf.title && pdf.link);

      return {
        title: lectureEl.querySelector('.lecture-title')?.value.trim() || '',
        videoLink: lectureEl.querySelector('.lecture-link')?.value.trim() || '',
        pdfs,
      };
    }).filter((lecture) => lecture.title);
  }

  function hydrateForm(course) {
    pageTitle.textContent = `Edit Course: ${course.name || ''}`;
    nameInput.value = course.name || '';
    descriptionInput.value = course.description || '';
    priceInput.value = String(course.price || 0);
    madeForInput.value = course.madeFor || 'other';
    imageInput.value = course.image || '';
    tagsInput.value = Array.isArray(course.tags) ? course.tags.join(', ') : '';
    publishedInput.checked = !!course.isPublished;

    lectureRows.innerHTML = '';
    const lectures = Array.isArray(course.lectures) ? course.lectures : [];
    if (!lectures.length) {
      addLectureRow();
    } else {
      lectures.forEach((lecture) => addLectureRow(lecture));
    }

    metaLectures.textContent = String(lectures.length);
    metaPurchases.textContent = String(Array.isArray(course.purchasedBy) ? course.purchasedBy.length : 0);
    metaCreatedBy.textContent = course.createdBy?.name || '-';
    metaUpdatedAt.textContent = formatDate(course.updatedAt);
  }

  function setSubmitting(isSubmitting) {
    saveBtn.disabled = isSubmitting;
    saveBtn.textContent = isSubmitting ? 'Updating...' : 'Update Course';
  }

  async function loadCourse() {
    setLoading(true);
    try {
      currentCourse = await API.get(`/courses/admin/${courseId}`);
      hydrateForm(currentCourse);
      showEditor();
    } catch (error) {
      showError(error.message || 'Failed to load course');
    }
  }

  addLectureRowBtn.addEventListener('click', () => addLectureRow());

  deleteBtn.addEventListener('click', async () => {
    if (!currentCourse) return;

    const confirmed = window.confirm(`Delete ${currentCourse.name}? This will remove all lectures in it.`);
    if (!confirmed) return;

    try {
      await API.delete(`/courses/${courseId}`);
      toast.success('Course deleted successfully');
      window.location.href = '/admin/courses/create/new';
    } catch (error) {
      toast.error(error.message || 'Failed to delete course');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    if (!name) {
      toast.error('Course name is required');
      nameInput.focus();
      return;
    }

    const lectures = collectLectures();

    setSubmitting(true);
    try {
      const payload = {
        name,
        description: descriptionInput.value.trim(),
        price: Number(priceInput.value || 0),
        madeFor: madeForInput.value,
        image: imageInput.value.trim(),
        tags: tagsInput.value.trim(),
        isPublished: publishedInput.checked,
      };

      await API.put(`/courses/${courseId}`, payload);
      await API.put(`/courses/${courseId}/lectures`, { lectures });
      toast.success('Course updated successfully');
      await loadCourse();
    } catch (error) {
      toast.error(error.message || 'Failed to update course');
    } finally {
      setSubmitting(false);
    }
  });

  await loadCourse();
});
