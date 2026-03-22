document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  const courseId = window.location.pathname.split('/')[3];
  const lecturesListEl = document.getElementById('lectures-list');
  let course = null;

  function closeLectureMenus() {
    lecturesListEl.querySelectorAll('.lecture-menu-panel').forEach((panel) => {
      panel.classList.add('hidden');
    });
  }

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

      return `
        <div data-lecture-card="${lecture._id}" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lift">
          <div class="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500"></div>
          <div class="p-4 md:p-5">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h3 class="font-semibold text-gray-900">${index + 1}. ${safeTitle}</h3>
              <span class="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">${videoAvailable ? 'Video Ready' : 'No Video'} | ${pdfs.length} Attachments</span>
            </div>
            <div class="mt-3 relative lecture-menu">
              <button
                type="button"
                data-menu-toggle
                class="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold bg-garud-highlight text-white hover:opacity-95"
              >
                Open Lecture Menu
              </button>

              <div class="lecture-menu-panel hidden absolute z-20 mt-2 w-full sm:w-64 rounded-xl border border-gray-200 bg-white shadow-lg p-2 space-y-1">
                <button
                  type="button"
                  data-open-player="${lecture._id}"
                  data-action="video"
                  ${videoAvailable ? '' : 'disabled'}
                  class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${videoAvailable ? 'text-gray-800 hover:bg-slate-100' : 'text-gray-400 cursor-not-allowed'}"
                >
                  Play Lecture
                </button>
                <button
                  type="button"
                  data-open-player="${lecture._id}"
                  data-action="attachments"
                  ${attachmentAvailable ? '' : 'disabled'}
                  class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${attachmentAvailable ? 'text-gray-800 hover:bg-slate-100' : 'text-gray-400 cursor-not-allowed'}"
                >
                  Open Attachments
                </button>
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
    const toggleBtn = event.target.closest('[data-menu-toggle]');
    if (toggleBtn) {
      const menu = toggleBtn.closest('.lecture-menu');
      const panel = menu?.querySelector('.lecture-menu-panel');
      if (!panel) return;

      const isHidden = panel.classList.contains('hidden');
      closeLectureMenus();
      if (isHidden) panel.classList.remove('hidden');
      return;
    }

    const openBtn = event.target.closest('[data-open-player]');
    if (!openBtn || openBtn.disabled) return;

    const action = openBtn.dataset.action || 'video';
    const lectureId = openBtn.dataset.openPlayer;
    if (!lectureId) return;

    closeLectureMenus();
    window.location.href = `/student/course/${courseId}/player?lectureId=${encodeURIComponent(lectureId)}&tab=${encodeURIComponent(action)}`;
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.lecture-menu')) {
      closeLectureMenus();
    }
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
