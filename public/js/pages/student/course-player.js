document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  const parts = window.location.pathname.split('/').filter(Boolean);
  const courseId = parts[2] || '';
  const params = new URLSearchParams(window.location.search);
  const requestedLectureId = params.get('lectureId') || '';
  let activeTab = params.get('tab') === 'attachments' ? 'attachments' : 'video';

  const loadingEl = document.getElementById('loading');
  const playerRootEl = document.getElementById('player-root');
  const playerPanelEl = document.getElementById('player-panel');
  const lectureListEl = document.getElementById('player-lecture-list');
  const courseNameEl = document.getElementById('player-course-name');
  const lectureTitleEl = document.getElementById('player-lecture-title');
  const backBtn = document.getElementById('back-btn');
  const tabVideoBtn = document.getElementById('tab-video');
  const tabAttachmentsBtn = document.getElementById('tab-attachments');

  let course = null;
  let activeLecture = null;
  let playbackRequestId = 0;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setTabUi() {
    const videoActive = activeTab === 'video';
    tabVideoBtn.className = `px-3 py-1.5 rounded-lg text-xs font-semibold transition ${videoActive ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-white/10 text-white/80 hover:bg-white/15'}`;
    tabAttachmentsBtn.className = `px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!videoActive ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-white/10 text-white/80 hover:bg-white/15'}`;
  }

  function formatTime(secondsValue) {
    const total = Math.max(0, Math.floor(Number(secondsValue) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    if (hours > 0) {
      return `${String(hours)}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
  }

  function updateQuery() {
    const next = new URLSearchParams(window.location.search);
    next.set('lectureId', activeLecture?._id || '');
    next.set('tab', activeTab);
    window.history.replaceState({}, '', `${window.location.pathname}?${next.toString()}`);
  }

  async function renderVideoPanel() {
    const requestId = ++playbackRequestId;

    const lectureId = String(activeLecture?._id || '');
    if (!lectureId) {
      playerPanelEl.innerHTML = '<div class="h-full flex items-center justify-center text-sm text-white/60">No lecture selected.</div>';
      return;
    }

    playerPanelEl.innerHTML = '<div class="h-full flex items-center justify-center text-sm text-white/60">Preparing secure stream...</div>';

    let playbackData;
    try {
      playbackData = await API.get(`/courses/published/${courseId}/lectures/${lectureId}/playback`);
    } catch (error) {
      if (requestId !== playbackRequestId) return;
      playerPanelEl.innerHTML = `<div class="h-full flex items-center justify-center text-sm text-white/70 px-6 text-center">${escapeHtml(error.message || 'Unable to load signed playback URL')}</div>`;
      return;
    }

    if (requestId !== playbackRequestId) return;

    const playbackUrl = String(playbackData?.playbackUrl || '').trim();
    if (!playbackUrl) {
      playerPanelEl.innerHTML = '<div class="h-full flex items-center justify-center text-sm text-white/60">No playback URL returned.</div>';
      return;
    }

    const title = escapeHtml(activeLecture.title || 'Lecture');
    playerPanelEl.innerHTML = `
      <div class="h-full flex flex-col">
        <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
          <p class="text-sm font-semibold truncate">${title}</p>
          <span class="text-[11px] px-2 py-1 rounded-md bg-red-500/20 text-red-200 border border-red-400/30">Now Playing</span>
        </div>

        <div class="flex-1 relative bg-black">
          <video id="secure-video" class="w-full h-full" preload="metadata" playsinline controlslist="nodownload noplaybackrate" disablepictureinpicture></video>
        </div>

        <div class="border-t border-white/10 bg-slate-950/90 px-3 py-2 space-y-2">
          <input id="video-progress" type="range" min="0" max="1000" value="0" class="w-full accent-red-500" />
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <button id="video-play-toggle" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15">Play</button>
              <button id="video-backward" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15">-10s</button>
              <button id="video-forward" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15">+10s</button>
              <button id="video-mute" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15">Mute</button>
            </div>
            <div class="flex items-center gap-2">
              <span id="video-time" class="text-xs text-white/70">0:00 / 0:00</span>
              <button id="video-fullscreen" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15">Full Screen</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const videoEl = document.getElementById('secure-video');
    const playToggleEl = document.getElementById('video-play-toggle');
    const backwardEl = document.getElementById('video-backward');
    const forwardEl = document.getElementById('video-forward');
    const muteEl = document.getElementById('video-mute');
    const progressEl = document.getElementById('video-progress');
    const timeEl = document.getElementById('video-time');
    const fullscreenEl = document.getElementById('video-fullscreen');

    let seeking = false;

    function syncTime() {
      const current = videoEl.currentTime || 0;
      const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;

      if (!seeking && duration > 0) {
        progressEl.value = String(Math.floor((current / duration) * 1000));
      }

      timeEl.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
      playToggleEl.textContent = videoEl.paused ? 'Play' : 'Pause';
      muteEl.textContent = videoEl.muted ? 'Unmute' : 'Mute';
    }

    playToggleEl.addEventListener('click', () => {
      if (videoEl.paused) {
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
    });

    backwardEl.addEventListener('click', () => {
      videoEl.currentTime = Math.max(0, (videoEl.currentTime || 0) - 10);
    });

    forwardEl.addEventListener('click', () => {
      const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : videoEl.currentTime + 10;
      videoEl.currentTime = Math.min(duration, (videoEl.currentTime || 0) + 10);
    });

    muteEl.addEventListener('click', () => {
      videoEl.muted = !videoEl.muted;
      syncTime();
    });

    progressEl.addEventListener('input', () => {
      seeking = true;
      const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;
      if (duration > 0) {
        const target = (Number(progressEl.value) / 1000) * duration;
        timeEl.textContent = `${formatTime(target)} / ${formatTime(duration)}`;
      }
    });

    progressEl.addEventListener('change', () => {
      const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;
      if (duration > 0) {
        videoEl.currentTime = (Number(progressEl.value) / 1000) * duration;
      }
      seeking = false;
    });

    fullscreenEl.addEventListener('click', async () => {
      const container = videoEl.parentElement;
      if (!container) return;

      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          await container.requestFullscreen();
        }
      } catch (_) {
        // no-op
      }
    });

    videoEl.addEventListener('play', syncTime);
    videoEl.addEventListener('pause', syncTime);
    videoEl.addEventListener('timeupdate', syncTime);
    videoEl.addEventListener('loadedmetadata', syncTime);
    videoEl.addEventListener('ended', syncTime);
    videoEl.addEventListener('error', () => {
      timeEl.textContent = 'Playback error';
    });

    videoEl.src = playbackUrl;
    videoEl.load();
  }

  function renderPanel() {
    if (!activeLecture) {
      playerPanelEl.innerHTML = '<div class="h-full flex items-center justify-center text-sm text-white/60">No lecture selected.</div>';
      return;
    }

    const pdfs = Array.isArray(activeLecture.pdfs) ? activeLecture.pdfs : [];

    lectureTitleEl.textContent = activeLecture.title || 'Lecture';

    if (activeTab === 'attachments') {
      if (!pdfs.length) {
        playerPanelEl.innerHTML = '<div class="h-full flex items-center justify-center text-sm text-white/60">No attachments for this lecture.</div>';
        return;
      }

      playerPanelEl.innerHTML = `
        <div class="h-full overflow-auto p-4 md:p-6">
          <h2 class="text-lg font-semibold mb-4">Attachments</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${pdfs.map((pdf) => `
              <a href="${escapeHtml(pdf.link || '#')}" target="_blank" rel="noopener" class="p-3 rounded-xl border border-white/10 bg-slate-900/70 hover:bg-slate-800 transition">
                <p class="text-sm font-semibold">${escapeHtml(pdf.title || 'PDF')}</p>
                <p class="text-xs text-cyan-300/80 mt-1">Open Attachment</p>
              </a>
            `).join('')}
          </div>
        </div>
      `;
      return;
    }

    if (!String(activeLecture.videoLink || '').trim()) {
      playerPanelEl.innerHTML = '<div class="h-full flex items-center justify-center text-sm text-white/60">No video link available for this lecture.</div>';
      return;
    }

    renderVideoPanel();
  }

  function renderLectureList() {
    const lectures = Array.isArray(course?.lectures) ? course.lectures : [];
    lectureListEl.innerHTML = lectures
      .map((lecture, index) => {
        const isActive = String(lecture._id) === String(activeLecture?._id);
        return `
          <button
            type="button"
            data-lecture-id="${lecture._id}"
            class="w-full text-left rounded-xl border px-3 py-2.5 transition ${isActive ? 'border-cyan-300/60 bg-cyan-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}"
          >
            <p class="text-xs text-white/50">Lecture ${index + 1}</p>
            <p class="text-sm font-medium mt-0.5">${escapeHtml(lecture.title || 'Untitled')}</p>
            <p class="text-[11px] text-white/50 mt-1">${lecture.videoLink ? 'Video available' : 'No video'} | ${(lecture.pdfs || []).length} attachments</p>
          </button>
        `;
      })
      .join('');
  }

  function setActiveLectureById(lectureId) {
    const lectures = Array.isArray(course?.lectures) ? course.lectures : [];
    activeLecture = lectures.find((lecture) => String(lecture._id) === String(lectureId)) || lectures[0] || null;
  }

  function renderAll() {
    setTabUi();
    renderLectureList();
    renderPanel();
    updateQuery();
  }

  lectureListEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-lecture-id]');
    if (!button) return;
    setActiveLectureById(button.dataset.lectureId);
    renderAll();
  });

  tabVideoBtn.addEventListener('click', () => {
    activeTab = 'video';
    renderAll();
  });

  tabAttachmentsBtn.addEventListener('click', () => {
    activeTab = 'attachments';
    renderAll();
  });

  backBtn.addEventListener('click', () => {
    window.location.href = `/student/course/${courseId}`;
  });

  // Basic deterrents; client-side apps cannot guarantee URL secrecy in-browser.
  document.addEventListener('contextmenu', (event) => {
    if (playerRootEl.contains(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener('dragstart', (event) => {
    if (playerRootEl.contains(event.target)) {
      event.preventDefault();
    }
  });

  try {
    course = await API.get(`/courses/published/${courseId}`);
    courseNameEl.textContent = course.name || 'Course Player';
    setActiveLectureById(requestedLectureId);
    renderAll();
  } catch (error) {
    toast.error(error.message || 'Unable to open course player');
    window.location.href = '/student/purchase-courses';
    return;
  } finally {
    loadingEl.classList.add('hidden');
    playerRootEl.classList.remove('hidden');
  }
});
