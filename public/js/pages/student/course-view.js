document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  const courseId = window.location.pathname.split('/')[3];
  const lecturesListEl = document.getElementById('lectures-list');
  const lessonStatsEl = document.getElementById('lesson-stats');
  let course = null;
  let expandedLectureIds = {};

  function render() {
    document.getElementById('course-name').textContent = course.name;
    const desc = document.getElementById('course-desc');
    if (course.description) {
      desc.textContent = course.description;
      desc.classList.remove('hidden');
    }

    const actions = document.getElementById('purchase-actions');
    actions.innerHTML = '<span class="px-4 py-2 bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 rounded-xl text-sm font-semibold inline-block backdrop-blur">Access Granted</span>';

    const lectures = Array.isArray(course.lectures) ? course.lectures : [];
    document.getElementById('lecture-count').textContent = String(lectures.length);
    const attachmentCount = lectures.reduce((sum, lecture) => {
      const pdfs = Array.isArray(lecture?.pdfs) ? lecture.pdfs : [];
      return sum + pdfs.length;
    }, 0);
    if (lessonStatsEl) {
      lessonStatsEl.textContent = `${lectures.length} lessons | ${attachmentCount} attachments`;
    }

    const listEl = lecturesListEl;

    if (!lectures.length) {
      listEl.innerHTML = '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-sm text-gray-500 text-center">No lectures added yet.</div>';
      return;
    }

    listEl.innerHTML = lectures.map((lecture, index) => {
      const safeTitle = escapeHtml(lecture.title || `Lecture ${index + 1}`);
      const pdfs = Array.isArray(lecture.pdfs) ? lecture.pdfs : [];
      const videoAvailable = !!String(lecture.videoLink || '').trim();
      const attachmentAvailable = pdfs.length > 0;
      const isExpanded = !!expandedLectureIds[String(lecture._id)];

      return `
        <div data-lecture-card="${lecture._id}" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lift">
          <div class="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500"></div>
          <div class="p-4 md:p-5">
            <button
              type="button"
              data-toggle-lecture="${lecture._id}"
              class="w-full flex items-center justify-between gap-3 text-left"
            >
              <div>
                <h3 class="font-semibold text-gray-900">${index + 1}. ${safeTitle}</h3>
                <p class="text-xs text-slate-500 mt-1">${videoAvailable ? 'Video available' : 'No video'} | ${pdfs.length} attachments</p>
              </div>
              <span class="text-blue-700 text-xl leading-none">${isExpanded ? '&#9650;' : '&#9660;'}</span>
            </button>

            <div class="${isExpanded ? 'mt-4' : 'hidden'}" data-lecture-body="${lecture._id}">
              <div class="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  data-open-player="${lecture._id}"
                  data-action="video"
                  ${videoAvailable ? '' : 'disabled'}
                  class="px-4 py-2.5 rounded-xl text-sm font-semibold ${videoAvailable ? 'bg-garud-highlight text-white hover:opacity-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}"
                >
                  Play Video
                </button>
                <button
                  type="button"
                  data-open-player="${lecture._id}"
                  data-action="attachments"
                  ${attachmentAvailable ? '' : 'disabled'}
                  class="px-4 py-2.5 rounded-xl text-sm font-semibold ${attachmentAvailable ? 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50' : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'}"
                >
                  Open Attachments
                </button>
              </div>

              <div class="mt-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Attachments</p>
                ${attachmentAvailable
                  ? `<div class="mt-2 space-y-2">${pdfs.map((pdf, pdfIndex) => `
                      <a
                        href="${escapeHtml(pdf.link || '#')}"
                        target="_blank"
                        rel="noopener"
                        class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-blue-100 bg-blue-50/40 hover:bg-blue-50"
                      >
                        <span class="text-sm text-slate-800 truncate">${escapeHtml(pdf.title || `Attachment ${pdfIndex + 1}`)}</span>
                        <span class="text-xs text-blue-700 font-semibold">Open</span>
                      </a>`).join('')}</div>`
                  : '<p class="mt-2 text-sm text-slate-500">No attachments for this lecture.</p>'}
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  async function loadData() {
    try {
      const [courseResponse] = await Promise.all([
        API.get(`/courses/published/${courseId}`),
      ]);
      course = courseResponse;
      render();
    } catch (error) {
      if (error.status === 403) {
        toast.error('Purchase this course first to open lecture content');
      } else {
        toast.error(error.message || 'Failed to load course');
      }
      window.location.href = '/student/purchase-courses';
    } finally {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('main-content').classList.remove('hidden');
    }
  }

  lecturesListEl.addEventListener('click', (event) => {
    const toggleLectureBtn = event.target.closest('[data-toggle-lecture]');
    if (toggleLectureBtn) {
      const lectureId = String(toggleLectureBtn.dataset.toggleLecture || '');
      if (!lectureId) return;
      expandedLectureIds = {
        ...expandedLectureIds,
        [lectureId]: !expandedLectureIds[lectureId],
      };
      render();
      return;
    }

    const openBtn = event.target.closest('[data-open-player]');
    if (!openBtn || openBtn.disabled) return;

    const action = openBtn.dataset.action || 'video';
    const lectureId = openBtn.dataset.openPlayer;
    if (!lectureId) return;
    window.location.href = `/student/course/${courseId}/player?lectureId=${encodeURIComponent(lectureId)}&tab=${encodeURIComponent(action)}`;
  });

  await loadData();
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
