/**
 * pages/admin-course.js
 * Course creation UI backed by Course model endpoints.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('admin');
  if (!user) return;

  const modal = document.getElementById('create-course-modal');
  const openModalBtn = document.getElementById('open-create-course-modal');
  const closeModalBtn = document.getElementById('close-create-course-modal');
  const cancelBtn = document.getElementById('cancel-create-course');
  const backdrop = document.getElementById('course-modal-backdrop');
  const form = document.getElementById('create-course-form');
  const modalTitle = document.getElementById('course-modal-title');
  const submitBtn = document.getElementById('submit-create-course');
  const nameInput = document.getElementById('course-name');
  const descriptionInput = document.getElementById('course-description');
  const priceInput = document.getElementById('course-price');
  const madeForInput = document.getElementById('course-made-for');
  const imageInput = document.getElementById('course-image');
  const tagsInput = document.getElementById('course-tags');
  const publishedInput = document.getElementById('course-published');
  const lectureRows = document.getElementById('lecture-rows');
  const addLectureRowBtn = document.getElementById('add-lecture-row');
  const courseList = document.getElementById('course-list');
  const courseCount = document.getElementById('course-count');

  let courses = [];

  function openModal() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => nameInput.focus(), 0);
  }

  function openCreateModal() {
    openModal();
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.setAttribute('aria-hidden', 'true');
    form.reset();
    modalTitle.textContent = 'Create New Course';
    submitBtn.textContent = 'Save Course';
    lectureRows.innerHTML = '';
    addLectureInputRow();
  }

  function addPdfInputRow(pdfRows, initial = {}) {
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

  function addLectureInputRow(initial = {}) {
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
    pdfs.forEach((pdf) => addPdfInputRow(pdfRows, pdf));

    row.querySelector('.add-pdf-row').addEventListener('click', () => addPdfInputRow(pdfRows));

    row.querySelector('.remove-lecture-row').addEventListener('click', () => {
      row.remove();
      if (!lectureRows.children.length) addLectureInputRow();
    });

    lectureRows.appendChild(row);
  }

  function renderCourses() {
    courseCount.textContent = String(courses.length);

    if (!courses.length) {
      courseList.innerHTML = '<div class="p-6 text-sm text-gray-500">No courses yet. Create your first one.</div>';
      return;
    }

    courseList.innerHTML = courses.map((course, idx) => `
      <div class="px-5 py-4 flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-gray-800">${escapeHtml(course.name)}</p>
          <p class="text-xs text-gray-500 mt-1">Lectures: ${course.lectureCount || course.lectures?.length || 0} · Price: Rs ${course.price || 0} · ${course.isPublished ? 'Published' : 'Draft'}</p>
          <p class="text-xs text-gray-500 mt-1">Created: ${formatDate(course.createdAt)}</p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span class="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-medium">#${idx + 1}</span>
          <div class="flex gap-2">
            <button type="button" data-edit-id="${course._id}" class="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Edit</button>
            <button type="button" data-delete-id="${course._id}" class="px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async function deleteCourse(courseId) {
    const course = courses.find((item) => item._id === courseId);
    const title = course?.name || 'this course';
    if (!window.confirm(`Delete ${title}? This will remove all lectures in it.`)) return;

    try {
      await API.delete(`/courses/${courseId}`);
      toast.success('Course deleted successfully');
      await loadCourses();
    } catch (err) {
      toast.error(err.message || 'Failed to delete course');
    }
  }

  async function loadCourses() {
    try {
      courses = await API.get('/courses/admin/all');
      renderCourses();
    } catch (err) {
      courseList.innerHTML = '<div class="p-6 text-sm text-red-500">Failed to load courses.</div>';
      toast.error(err.message || 'Failed to load courses');
    }
  }

  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Saving...' : 'Save Course';
  }

  openModalBtn.addEventListener('click', openCreateModal);
  closeModalBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  addLectureRowBtn.addEventListener('click', () => addLectureInputRow());

  courseList.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-edit-id]');
    if (editBtn) {
      window.location.href = `/admin/courses/${editBtn.dataset.editId}/edit`;
      return;
    }

    const deleteBtn = event.target.closest('[data-delete-id]');
    if (deleteBtn) {
      deleteCourse(deleteBtn.dataset.deleteId);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
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

    const isDuplicate = courses.some((course) => {
      const sameName = course.name.toLowerCase() === name.toLowerCase();
      return sameName;
    });
    if (isDuplicate) {
      toast.error('Course already exists');
      return;
    }

    const lectures = Array.from(lectureRows.querySelectorAll(':scope > div'))
      .map((lectureEl) => {
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
      })
      .filter((lecture) => lecture.title);

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

      await API.post('/courses', { ...payload, lectures });
      toast.success('Course created successfully');

      closeModal();
      await loadCourses();
    } catch (err) {
      toast.error(err.message || 'Failed to save course');
    } finally {
      setSubmitting(false);
    }
  });

  addLectureInputRow();
  await loadCourses();
});

function formatDate(dateValue) {
  if (!dateValue) return '-';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
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
