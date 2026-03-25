document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  const courseId = window.location.pathname.split('/')[3];
  const lecturesListEl = document.getElementById('lectures-list');
  const lessonStatsEl = document.getElementById('lesson-stats');
  const lectureSearchEl = document.getElementById('lecture-search');
  const filterBtns = Array.from(document.querySelectorAll('[data-filter]'));
  let course = null;
  let expandedLectureIds = {};
  let activeFilter = 'all';
  let searchQuery = '';

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
    const videoCount = lectures.reduce((sum, lecture) => {
      return sum + (String(lecture?.videoLink || '').trim() ? 1 : 0);
    }, 0);
    const attachmentCount = lectures.reduce((sum, lecture) => {
      const pdfs = Array.isArray(lecture?.pdfs) ? lecture.pdfs : [];
      return sum + pdfs.length;
    }, 0);

    const videoCountEl = document.getElementById('video-count');
    if (videoCountEl) {
      videoCountEl.textContent = String(videoCount);
    }

    const attachmentCountEl = document.getElementById('attachment-count');
    if (attachmentCountEl) {
      attachmentCountEl.textContent = String(attachmentCount);
    }

    const progressEl = document.getElementById('curriculum-progress');
    if (progressEl) {
      const percent = lectures.length ? Math.round((videoCount / lectures.length) * 100) : 0;
      progressEl.textContent = `${percent}%`;
    }

    if (lessonStatsEl) {
      lessonStatsEl.textContent = `${lectures.length} lessons | ${attachmentCount} attachments`;
    }

    const filteredLectures = lectures
      .map((lecture, index) => ({ lecture, index }))
      .filter(({ lecture }) => {
        const title = String(lecture?.title || '').toLowerCase();
        const pdfCount = Array.isArray(lecture?.pdfs) ? lecture.pdfs.length : 0;
        const hasVideo = !!String(lecture?.videoLink || '').trim();
        const matchesSearch = !searchQuery || title.includes(searchQuery);

        if (activeFilter === 'video') {
          return hasVideo && matchesSearch;
        }

        if (activeFilter === 'notes') {
          return pdfCount > 0 && matchesSearch;
        }

        return matchesSearch;
      });

    const listEl = lecturesListEl;

    if (!lectures.length) {
      listEl.innerHTML = '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-sm text-gray-500 text-center">No lectures added yet.</div>';
      return;
    }

    if (!filteredLectures.length) {
      listEl.innerHTML = '<div class="coursepw-lecture p-7 text-sm text-slate-500 text-center">No lectures match your current search/filter.</div>';
      return;
    }

    listEl.innerHTML = filteredLectures.map(({ lecture, index }) => {
      const displayIndex = index + 1;
      const safeTitle = escapeHtml(lecture.title || `Lecture ${displayIndex}`);
      const pdfs = Array.isArray(lecture.pdfs) ? lecture.pdfs : [];
      const videoAvailable = !!String(lecture.videoLink || '').trim();
      const attachmentAvailable = pdfs.length > 0;
      const isExpanded = !!expandedLectureIds[String(lecture._id)];

      const lectureTag = videoAvailable && attachmentAvailable
        ? 'Complete Lesson'
        : (videoAvailable ? 'Video First' : (attachmentAvailable ? 'Notes Available' : 'Coming Soon'));

      return `
        <article data-lecture-card="${lecture._id}" class="coursepw-lecture p-4 md:p-5 lift">
          <div class="grid grid-cols-1 md:grid-cols-[170px,minmax(0,1fr)] gap-4">
            <div class="coursepw-lecture-media rounded-xl p-4 flex flex-col justify-between min-h-[124px]">
              <p class="text-xs font-semibold uppercase tracking-wide text-orange-700/80">Lecture ${displayIndex}</p>
              <p class="text-lg leading-none">${videoAvailable ? '&#9658;' : '&#128196;'}</p>
              <p class="text-xs text-slate-700">${lectureTag}</p>
            </div>

            <div>
              <button
                type="button"
                data-toggle-lecture="${lecture._id}"
                class="w-full flex items-start justify-between gap-3 text-left"
              >
                <div>
                  <h3 class="font-semibold text-slate-900">${displayIndex}. ${safeTitle}</h3>
                  <p class="text-xs text-slate-500 mt-1">${videoAvailable ? 'Video available' : 'No video yet'} | ${pdfs.length} attachments</p>
                </div>
                <span class="text-orange-600 text-lg leading-none mt-0.5">${isExpanded ? '&#9650;' : '&#9660;'}</span>
              </button>

              <div class="${isExpanded ? 'mt-4' : 'hidden'}" data-lecture-body="${lecture._id}">
                <div class="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  data-open-player="${lecture._id}"
                  data-action="video"
                  ${videoAvailable ? '' : 'disabled'}
                  class="px-4 py-2.5 rounded-xl text-sm font-semibold ${videoAvailable ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}"
                >
                  Watch Lecture
                </button>
                <button
                  type="button"
                  data-open-player="${lecture._id}"
                  data-action="attachments"
                  ${attachmentAvailable ? '' : 'disabled'}
                  class="px-4 py-2.5 rounded-xl text-sm font-semibold ${attachmentAvailable ? 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-50' : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'}"
                >
                  Open Notes
                </button>
                </div>

                <div class="mt-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Attachments</p>
                  ${attachmentAvailable
                    ? `<div class="mt-2 space-y-2">${pdfs.map((pdf, pdfIndex) => `
                      <a
                        href="${sanitizeUrl(pdf.link)}"
                        target="_blank"
                        rel="noopener"
                        class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-orange-100 bg-orange-50/50 hover:bg-orange-50"
                      >
                        <span class="text-sm text-slate-800 truncate">${escapeHtml(pdf.title || `Attachment ${pdfIndex + 1}`)}</span>
                        <span class="text-xs text-orange-700 font-semibold">Open</span>
                      </a>`).join('')}</div>`
                    : '<p class="mt-2 text-sm text-slate-500">No attachments for this lecture.</p>'}
                </div>
              </div>
            </div>
          </div>
        </article>`;
    }).join('');

    filterBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.filter === activeFilter);
      btn.setAttribute('aria-pressed', btn.dataset.filter === activeFilter ? 'true' : 'false');
    });
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

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedFilter = btn.dataset.filter || 'all';
      if (selectedFilter === activeFilter) return;
      activeFilter = selectedFilter;
      render();
    });
  });

  if (lectureSearchEl) {
    lectureSearchEl.addEventListener('input', (event) => {
      searchQuery = String(event.target?.value || '').trim().toLowerCase();
      render();
    });
  }

  await loadData();
});

function sanitizeUrl(link) {
  const value = String(link || '').trim();
  if (!value) return '#';

  if (value.startsWith('/')) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return '#';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
