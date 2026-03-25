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
  const lessonStatsEl = document.getElementById('player-lesson-stats');
  const activeChipEl = document.getElementById('player-active-chip');
  const lectureSearchEl = document.getElementById('player-lecture-search');
  const prevLectureBtn = document.getElementById('prev-lecture');
  const nextLectureBtn = document.getElementById('next-lecture');

  let course = null;
  let activeLecture = null;
  let playbackRequestId = 0;
  let lectureSearchQuery = '';

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
    tabVideoBtn.classList.toggle('active', videoActive);
    tabAttachmentsBtn.classList.toggle('active', !videoActive);

    if (activeChipEl) {
      activeChipEl.textContent = videoActive ? 'Video Mode' : 'Attachment Mode';
    }
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

  function getEmbedUrl(videoLink) {
    const raw = String(videoLink || '').trim();
    if (!raw) return '';

    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase();

      if (host === 'youtu.be') {
        const id = parsed.pathname.replace(/^\/+/, '').split('/')[0];
        return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0` : '';
      }

      if (host.endsWith('youtube.com')) {
        if (parsed.pathname.startsWith('/embed/')) {
          const id = parsed.pathname.split('/embed/')[1]?.split('/')[0];
          return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0` : '';
        }
        const id = parsed.searchParams.get('v');
        return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0` : '';
      }

      if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
        const segments = parsed.pathname.split('/').filter(Boolean);
        const id = segments.find((part) => /^\d+$/.test(part));
        return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : '';
      }
    } catch (_) {
      return '';
    }

    return '';
  }

  function updateQuery() {
    const next = new URLSearchParams(window.location.search);
    next.set('lectureId', activeLecture?._id || '');
    next.set('tab', activeTab);
    window.history.replaceState({}, '', `${window.location.pathname}?${next.toString()}`);
  }

  function getActiveLectureIndex() {
    const lectures = Array.isArray(course?.lectures) ? course.lectures : [];
    return lectures.findIndex((lecture) => String(lecture._id) === String(activeLecture?._id));
  }

  function updateNavButtons() {
    const lectures = Array.isArray(course?.lectures) ? course.lectures : [];
    const index = getActiveLectureIndex();

    if (!prevLectureBtn || !nextLectureBtn) return;

    prevLectureBtn.disabled = index <= 0;
    nextLectureBtn.disabled = index === -1 || index >= lectures.length - 1;

    prevLectureBtn.classList.toggle('opacity-50', prevLectureBtn.disabled);
    nextLectureBtn.classList.toggle('opacity-50', nextLectureBtn.disabled);
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
        <div class="px-4 py-3 border-b border-white/10 bg-slate-950/70 flex items-center justify-between gap-3">
          <p class="text-sm font-semibold truncate">${title}</p>
          <span class="text-[11px] px-2 py-1 rounded-md bg-orange-500/20 text-orange-100 border border-orange-300/30">Now Playing</span>
        </div>

        <div id="video-shell" tabindex="0" class="flex-1 relative bg-black outline-none select-none">
          <video id="secure-video" class="w-full h-full object-contain" preload="metadata" playsinline controlslist="nodownload noremoteplayback" disablepictureinpicture></video>

          <div id="video-loading-overlay" class="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
            <div class="flex items-center gap-2.5 px-3 py-2 rounded-full bg-black/65 border border-white/20 text-xs font-semibold text-white">
              <span class="spinner" style="width: 1rem; height: 1rem; border-width: 2px;"></span>
              <span>Loading video...</span>
            </div>
          </div>

          <button id="video-seek-left-zone" type="button" class="md:hidden absolute left-0 top-0 bottom-0 w-1/2 z-10" aria-label="Double tap left to rewind"></button>
          <button id="video-seek-right-zone" type="button" class="md:hidden absolute right-0 top-0 bottom-0 w-1/2 z-10" aria-label="Double tap right to forward"></button>

          <div id="video-seek-feedback" class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-3 py-1.5 rounded-full bg-black/65 border border-white/20 text-xs font-semibold text-white opacity-0 transition-opacity duration-150">+10s</div>

          <div id="video-top-controls" class="absolute inset-x-0 top-0 z-20 p-3 bg-gradient-to-b from-black/65 via-black/20 to-transparent transition-opacity duration-200">
            <div class="flex items-start justify-between gap-3">
              <div class="max-w-[70%]">
                <p class="text-xs md:text-sm font-semibold text-white/95 truncate">${title}</p>
                <p class="text-[11px] text-white/65">Secure Lecture Stream</p>
              </div>
              <div class="relative">
                <button id="video-settings-btn" type="button" class="w-9 h-9 rounded-full text-base font-semibold bg-black/55 border border-white/25 hover:bg-black/75" aria-label="Player settings">&#9881;</button>
              <div id="video-settings-popover" class="hidden absolute right-0 top-11 min-w-44 rounded-xl border border-white/20 bg-slate-950/95 p-2.5 shadow-2xl">
                <p class="text-[11px] uppercase tracking-wide text-white/45 px-1">Playback Speed</p>
                <div id="video-speed-options" class="mt-1 space-y-1">
                  <button type="button" data-speed="0.75" class="video-speed-option w-full text-left text-xs rounded-md px-2 py-1.5 text-white/85 hover:bg-white/10">0.75x</button>
                  <button type="button" data-speed="1" class="video-speed-option w-full text-left text-xs rounded-md px-2 py-1.5 text-white bg-orange-500/25 border border-orange-400/45">1x</button>
                  <button type="button" data-speed="1.25" class="video-speed-option w-full text-left text-xs rounded-md px-2 py-1.5 text-white/85 hover:bg-white/10">1.25x</button>
                  <button type="button" data-speed="1.5" class="video-speed-option w-full text-left text-xs rounded-md px-2 py-1.5 text-white/85 hover:bg-white/10">1.5x</button>
                  <button type="button" data-speed="1.75" class="video-speed-option w-full text-left text-xs rounded-md px-2 py-1.5 text-white/85 hover:bg-white/10">1.75x</button>
                  <button type="button" data-speed="2" class="video-speed-option w-full text-left text-xs rounded-md px-2 py-1.5 text-white/85 hover:bg-white/10">2x</button>
                </div>

                <p class="text-[11px] uppercase tracking-wide text-white/45 px-1 mt-2">Quality</p>
                <div class="mt-1">
                  <button type="button" id="video-quality-label" class="w-full text-left text-xs rounded-md px-2 py-1.5 text-white bg-cyan-500/20 border border-cyan-400/35">Auto (Source)</button>
                </div>
              </div>
              </div>
            </div>
          </div>

          <div id="video-center-controls" class="absolute inset-0 z-20 flex items-center justify-center gap-3 pointer-events-none transition-opacity duration-200">
            <button id="video-center-backward" type="button" class="pointer-events-auto w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/60 border border-white/30 text-white text-xl hover:bg-black/80" aria-label="Back 10 seconds">&#8630;</button>
            <button id="video-center-play" type="button" class="pointer-events-auto w-14 h-14 md:w-16 md:h-16 rounded-full bg-black/70 border border-white/35 text-white text-2xl hover:bg-black/85" aria-label="Play or pause">&#9658;</button>
            <button id="video-center-forward" type="button" class="pointer-events-auto w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/60 border border-white/30 text-white text-xl hover:bg-black/80" aria-label="Forward 10 seconds">&#8631;</button>
          </div>

          <button id="video-overlay-play" type="button" class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 transition-opacity duration-200" aria-label="Play or pause">
            <span class="w-16 h-16 rounded-full bg-black/55 border border-white/20 text-white text-2xl flex items-center justify-center">&#9658;</span>
          </button>

          <div id="video-controls" class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/55 to-transparent transition-opacity duration-200">
            <input id="video-progress" type="range" min="0" max="1000" value="0" class="w-full accent-orange-500 appearance-none h-1.5 rounded-lg bg-white/25" />
            <div class="mt-2 flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 md:gap-2">
                <button id="video-play-toggle" type="button" class="w-9 h-9 rounded-full text-base bg-white/20 hover:bg-white/30" aria-label="Play or pause">&#9658;</button>
                <button id="video-backward" type="button" class="w-9 h-9 rounded-full text-base bg-white/20 hover:bg-white/30" aria-label="Back 10 seconds">&#8630;</button>
                <button id="video-forward" type="button" class="w-9 h-9 rounded-full text-base bg-white/20 hover:bg-white/30" aria-label="Forward 10 seconds">&#8631;</button>
                <button id="video-mute" type="button" class="w-9 h-9 rounded-full text-sm bg-white/20 hover:bg-white/30" aria-label="Mute or unmute">&#128266;</button>
                <input id="video-volume" type="range" min="0" max="100" value="100" class="hidden md:block w-20 accent-cyan-400" />
              </div>

              <div class="flex items-center gap-1.5 md:gap-2">
                <span id="video-time" class="text-xs text-white/80">0:00 / 0:00</span>
                <button id="video-pip" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30">PiP</button>
                <button id="video-fullscreen" type="button" class="w-9 h-9 rounded-full text-sm bg-white/20 hover:bg-white/30" aria-label="Toggle fullscreen">&#9974;</button>
              </div>
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
    const pipEl = document.getElementById('video-pip');
    const overlayPlayEl = document.getElementById('video-overlay-play');
    const controlsEl = document.getElementById('video-controls');
    const topControlsEl = document.getElementById('video-top-controls');
    const centerControlsEl = document.getElementById('video-center-controls');
    const videoShellEl = document.getElementById('video-shell');
    const volumeEl = document.getElementById('video-volume');
    const loadingOverlayEl = document.getElementById('video-loading-overlay');
    const settingsBtnEl = document.getElementById('video-settings-btn');
    const settingsPopoverEl = document.getElementById('video-settings-popover');
    const speedOptionEls = Array.from(document.querySelectorAll('.video-speed-option'));
    const qualityLabelEl = document.getElementById('video-quality-label');
    const centerPlayEl = document.getElementById('video-center-play');
    const centerBackwardEl = document.getElementById('video-center-backward');
    const centerForwardEl = document.getElementById('video-center-forward');
    const leftSeekZoneEl = document.getElementById('video-seek-left-zone');
    const rightSeekZoneEl = document.getElementById('video-seek-right-zone');
    const seekFeedbackEl = document.getElementById('video-seek-feedback');

    let seeking = false;
    let controlsHideTimeout = null;
    let isSettingsOpen = false;
    let lastLeftTapAt = 0;
    let lastRightTapAt = 0;
    let seekFeedbackTimeout = null;
    let leftTapTimeout = null;
    let rightTapTimeout = null;
    let controlsManuallyHidden = false;
    let hasStartedPlayback = false;
    let lastSettingsToggleAt = 0;

    function showLoadingOverlay() {
      if (loadingOverlayEl) {
        loadingOverlayEl.classList.remove('hidden');
      }
    }

    function hideLoadingOverlay() {
      if (loadingOverlayEl) {
        loadingOverlayEl.classList.add('hidden');
      }
    }

    if (qualityLabelEl) {
      qualityLabelEl.textContent = 'Auto (Source)';
    }

    function setControlsVisible(isVisible) {
      const hiddenClasses = ['opacity-0', 'pointer-events-none'];
      const targetSets = [controlsEl, topControlsEl, centerControlsEl];

      targetSets.forEach((target) => {
        if (!target) return;
        target.classList.toggle(hiddenClasses[0], !isVisible);
        target.classList.toggle(hiddenClasses[1], !isVisible);
      });
    }

    function showSeekFeedback(deltaSeconds) {
      if (!seekFeedbackEl) return;
      seekFeedbackEl.textContent = deltaSeconds > 0 ? `+${deltaSeconds}s` : `${deltaSeconds}s`;
      seekFeedbackEl.classList.remove('opacity-0');
      seekFeedbackEl.classList.add('opacity-100');

      if (seekFeedbackTimeout) {
        clearTimeout(seekFeedbackTimeout);
      }

      seekFeedbackTimeout = setTimeout(() => {
        seekFeedbackEl.classList.remove('opacity-100');
        seekFeedbackEl.classList.add('opacity-0');
      }, 420);
    }

    function quickSeek(deltaSeconds) {
      const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : videoEl.currentTime + Math.abs(deltaSeconds);
      const next = Math.max(0, Math.min(duration, (videoEl.currentTime || 0) + deltaSeconds));
      videoEl.currentTime = next;
      showSeekFeedback(deltaSeconds);
      scheduleControlsAutoHide();
    }

    function updateSpeedOptionsUi() {
      const currentRate = Number(videoEl.playbackRate || 1);
      speedOptionEls.forEach((optionEl) => {
        const value = Number(optionEl.dataset.speed || 1);
        const isSelected = Math.abs(value - currentRate) < 0.001;
        optionEl.className = `video-speed-option w-full text-left text-xs rounded-md px-2 py-1.5 ${isSelected ? 'text-white bg-orange-500/25 border border-orange-400/45' : 'text-white/85 hover:bg-white/10'}`;
      });
    }

    function setSettingsOpen(isOpen) {
      isSettingsOpen = isOpen;
      if (!settingsPopoverEl) return;

      settingsPopoverEl.classList.toggle('hidden', !isOpen);
      if (isOpen) {
        setControlsVisible(true);
      }
    }

    function updateProgressVisual() {
      const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;
      const current = videoEl.currentTime || 0;
      const playedPercent = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;

      let bufferedEnd = 0;
      if (duration > 0 && videoEl.buffered?.length) {
        for (let i = 0; i < videoEl.buffered.length; i += 1) {
          const start = videoEl.buffered.start(i);
          const end = videoEl.buffered.end(i);
          if (current >= start && current <= end) {
            bufferedEnd = end;
            break;
          }
          bufferedEnd = Math.max(bufferedEnd, end);
        }
      }

      const bufferedPercent = duration > 0 ? Math.min(100, Math.max(playedPercent, (bufferedEnd / duration) * 100)) : playedPercent;
      progressEl.style.background = `linear-gradient(to right, #f97316 0%, #f97316 ${playedPercent}%, rgba(148,163,184,0.75) ${playedPercent}%, rgba(148,163,184,0.75) ${bufferedPercent}%, rgba(148,163,184,0.26) ${bufferedPercent}%, rgba(148,163,184,0.26) 100%)`;
    }

    function scheduleControlsAutoHide() {
      if (controlsHideTimeout) {
        clearTimeout(controlsHideTimeout);
      }

      if (controlsManuallyHidden) {
        setControlsVisible(false);
        return;
      }

      setControlsVisible(true);

      if (videoEl.paused || isSettingsOpen) {
        return;
      }

      controlsHideTimeout = setTimeout(() => {
        if (controlsManuallyHidden) {
          setControlsVisible(false);
          return;
        }

        setControlsVisible(false);
      }, 2400);
    }

    function toggleControlsByTap() {
      controlsManuallyHidden = !controlsManuallyHidden;

      if (controlsManuallyHidden) {
        setSettingsOpen(false);
        if (controlsHideTimeout) {
          clearTimeout(controlsHideTimeout);
        }
        setControlsVisible(false);
        return;
      }

      scheduleControlsAutoHide();
    }

    function isFullscreenActive() {
      return !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
    }

    async function requestPlayerFullscreen() {
      if (!videoShellEl) return;

      const shell = videoShellEl;
      const shellAny = shell;

      if (shell.requestFullscreen) {
        await shell.requestFullscreen();
        return;
      }

      if (shellAny.webkitRequestFullscreen) {
        shellAny.webkitRequestFullscreen();
        return;
      }

      if (shellAny.msRequestFullscreen) {
        shellAny.msRequestFullscreen();
        return;
      }

      if (videoEl.webkitEnterFullscreen) {
        videoEl.webkitEnterFullscreen();
      }
    }

    async function exitPlayerFullscreen() {
      const docAny = document;
      const videoAny = videoEl;

      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return;
      }

      if (docAny.webkitExitFullscreen) {
        docAny.webkitExitFullscreen();
        return;
      }

      if (docAny.msExitFullscreen) {
        docAny.msExitFullscreen();
        return;
      }

      if (videoAny.webkitDisplayingFullscreen && videoAny.webkitExitFullscreen) {
        videoAny.webkitExitFullscreen();
      }
    }

    function updateFullscreenUi() {
      const active = isFullscreenActive();
      fullscreenEl.innerHTML = active ? '&#10005;' : '&#9974;';
      fullscreenEl.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Toggle fullscreen');
    }

    function togglePlayPause() {
      if (videoEl.paused) {
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
    }

    function syncTime() {
      const current = videoEl.currentTime || 0;
      const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;

      if (!seeking && duration > 0) {
        progressEl.value = String(Math.floor((current / duration) * 1000));
      }

      updateProgressVisual();

      timeEl.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
      playToggleEl.innerHTML = videoEl.paused ? '&#9658;' : '&#10074;&#10074;';
      muteEl.innerHTML = videoEl.muted || (videoEl.volume || 0) === 0 ? '&#128263;' : '&#128266;';
      overlayPlayEl.classList.toggle('opacity-100', videoEl.paused);
      overlayPlayEl.classList.toggle('opacity-0', !videoEl.paused);
      overlayPlayEl.classList.toggle('pointer-events-auto', videoEl.paused);
      overlayPlayEl.classList.toggle('pointer-events-none', !videoEl.paused);
      overlayPlayEl.querySelector('span').innerHTML = videoEl.paused ? '&#9658;' : '&#10074;&#10074;';
      if (centerPlayEl) {
        centerPlayEl.innerHTML = videoEl.paused ? '&#9658;' : '&#10074;&#10074;';
      }

      if (volumeEl) {
        volumeEl.value = String(Math.round((videoEl.volume || 0) * 100));
      }

      updateSpeedOptionsUi();
    }

    playToggleEl.addEventListener('click', () => {
      togglePlayPause();
      scheduleControlsAutoHide();
    });

    if (centerPlayEl) {
      centerPlayEl.addEventListener('click', (event) => {
        event.stopPropagation();
        togglePlayPause();
        scheduleControlsAutoHide();
      });
    }

    if (centerBackwardEl) {
      centerBackwardEl.addEventListener('click', (event) => {
        event.stopPropagation();
        quickSeek(-10);
      });
    }

    if (centerForwardEl) {
      centerForwardEl.addEventListener('click', (event) => {
        event.stopPropagation();
        quickSeek(10);
      });
    }

    overlayPlayEl.addEventListener('click', () => {
      togglePlayPause();
      scheduleControlsAutoHide();
    });

    backwardEl.addEventListener('click', () => {
      quickSeek(-10);
    });

    forwardEl.addEventListener('click', () => {
      quickSeek(10);
    });

    muteEl.addEventListener('click', () => {
      videoEl.muted = !videoEl.muted;
      syncTime();
      scheduleControlsAutoHide();
    });

    if (volumeEl) {
      volumeEl.addEventListener('input', () => {
        const volume = Math.max(0, Math.min(1, Number(volumeEl.value) / 100));
        videoEl.volume = volume;
        videoEl.muted = volume === 0;
        syncTime();
      });
    }

    progressEl.addEventListener('input', () => {
      seeking = true;
      const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;
      if (duration > 0) {
        const target = (Number(progressEl.value) / 1000) * duration;
        timeEl.textContent = `${formatTime(target)} / ${formatTime(duration)}`;
      }
      scheduleControlsAutoHide();
    });

    progressEl.addEventListener('change', () => {
      const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;
      if (duration > 0) {
        videoEl.currentTime = (Number(progressEl.value) / 1000) * duration;
      }
      seeking = false;
      scheduleControlsAutoHide();
    });

    speedOptionEls.forEach((optionEl) => {
      optionEl.addEventListener('click', () => {
        const speed = Number(optionEl.dataset.speed || 1);
        videoEl.playbackRate = speed;
        updateSpeedOptionsUi();
        setSettingsOpen(false);
        scheduleControlsAutoHide();
      });
    });

    if (settingsBtnEl) {
      const onSettingsToggle = (event) => {
        const now = Date.now();
        if (now - lastSettingsToggleAt < 220) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        lastSettingsToggleAt = now;
        event.preventDefault();
        event.stopPropagation();
        controlsManuallyHidden = false;
        setControlsVisible(true);
        setSettingsOpen(!isSettingsOpen);
        scheduleControlsAutoHide();
      };

      // pointerdown improves reliability on mobile where click may be delayed.
      settingsBtnEl.addEventListener('pointerdown', onSettingsToggle);
      settingsBtnEl.addEventListener('touchstart', onSettingsToggle, { passive: false });
      settingsBtnEl.addEventListener('click', onSettingsToggle);
    }

    pipEl.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement === videoEl) {
          await document.exitPictureInPicture();
          return;
        }

        if (document.pictureInPictureEnabled && !videoEl.disablePictureInPicture) {
          await videoEl.requestPictureInPicture();
        }
      } catch (_) {
        toast.error('Picture-in-picture is not available in this browser');
      }
      scheduleControlsAutoHide();
    });

    fullscreenEl.addEventListener('click', async () => {
      if (!videoShellEl) return;

      try {
        if (isFullscreenActive()) {
          await exitPlayerFullscreen();
        } else {
          await requestPlayerFullscreen();
        }
      } catch (_) {
        // no-op
      }
      scheduleControlsAutoHide();
    });

    document.addEventListener('fullscreenchange', () => {
      updateFullscreenUi();
      scheduleControlsAutoHide();
    });
    document.addEventListener('webkitfullscreenchange', () => {
      updateFullscreenUi();
      scheduleControlsAutoHide();
    });
    videoEl.addEventListener('webkitbeginfullscreen', () => {
      updateFullscreenUi();
      scheduleControlsAutoHide();
    });
    videoEl.addEventListener('webkitendfullscreen', () => {
      updateFullscreenUi();
      scheduleControlsAutoHide();
    });

    videoShellEl.addEventListener('mousemove', scheduleControlsAutoHide);
    videoShellEl.addEventListener('touchstart', scheduleControlsAutoHide, { passive: true });
    videoShellEl.addEventListener('dblclick', () => {
      fullscreenEl.click();
    });

    videoShellEl.addEventListener('click', (event) => {
      const inSettings = event.target.closest('#video-settings-btn') || event.target.closest('#video-settings-popover');
      if (inSettings) return;

      const interactiveControl = event.target.closest('#video-controls button, #video-controls input, #video-controls select, #video-top-controls button, #video-center-controls button');
      if (interactiveControl) {
        return;
      }

      toggleControlsByTap();
    });

    document.addEventListener('pointerdown', (event) => {
      if (!isSettingsOpen) return;
      const inSettings = event.target.closest('#video-settings-btn') || event.target.closest('#video-settings-popover');
      if (!inSettings) {
        setSettingsOpen(false);
      }
    });

    if (leftSeekZoneEl) {
      leftSeekZoneEl.addEventListener('touchend', (event) => {
        event.preventDefault();
        const now = Date.now();
        if (now - lastLeftTapAt < 280) {
          if (leftTapTimeout) {
            clearTimeout(leftTapTimeout);
            leftTapTimeout = null;
          }
          quickSeek(-10);
          lastLeftTapAt = 0;
          return;
        }
        lastLeftTapAt = now;

        leftTapTimeout = setTimeout(() => {
          toggleControlsByTap();
        }, 300);
      }, { passive: false });
    }

    if (rightSeekZoneEl) {
      rightSeekZoneEl.addEventListener('touchend', (event) => {
        event.preventDefault();
        const now = Date.now();
        if (now - lastRightTapAt < 280) {
          if (rightTapTimeout) {
            clearTimeout(rightTapTimeout);
            rightTapTimeout = null;
          }
          quickSeek(10);
          lastRightTapAt = 0;
          return;
        }
        lastRightTapAt = now;

        rightTapTimeout = setTimeout(() => {
          toggleControlsByTap();
        }, 300);
      }, { passive: false });
    }

    videoEl.addEventListener('play', syncTime);
    videoEl.addEventListener('pause', syncTime);
    videoEl.addEventListener('timeupdate', syncTime);
    videoEl.addEventListener('loadedmetadata', syncTime);
    videoEl.addEventListener('progress', updateProgressVisual);
    videoEl.addEventListener('ended', syncTime);
    videoEl.addEventListener('loadeddata', () => {
      // If data is ready for the first frame, don't block the player UI.
      hideLoadingOverlay();
    });
    videoEl.addEventListener('canplay', () => {
      hideLoadingOverlay();
    });
    videoEl.addEventListener('playing', () => {
      hasStartedPlayback = true;
      hideLoadingOverlay();
    });
    videoEl.addEventListener('waiting', () => {
      if (!hasStartedPlayback && loadingOverlayEl) {
        showLoadingOverlay();
      }
    });
    videoEl.addEventListener('loadstart', () => {
      showLoadingOverlay();
      hasStartedPlayback = false;
    });
    videoEl.addEventListener('timeupdate', () => {
      if ((videoEl.currentTime || 0) > 0) {
        hasStartedPlayback = true;
        hideLoadingOverlay();
      }
    });
    videoEl.addEventListener('error', () => {
      timeEl.textContent = 'Playback error';
      hideLoadingOverlay();
    });

    videoShellEl.onkeydown = (event) => {
      const key = String(event.key || '').toLowerCase();
      if (!key) return;

      const isTyping = /input|textarea|select/i.test(event.target?.tagName || '');
      if (isTyping) return;

      if (key === ' ' || key === 'k') {
        event.preventDefault();
        togglePlayPause();
      }

      if (key === 'j') {
        event.preventDefault();
        quickSeek(-10);
      }

      if (key === 'l') {
        event.preventDefault();
        quickSeek(10);
      }

      if (key === 'm') {
        event.preventDefault();
        videoEl.muted = !videoEl.muted;
        syncTime();
      }

      if (key === 'f') {
        event.preventDefault();
        fullscreenEl.click();
      }

      scheduleControlsAutoHide();
    };

    videoEl.src = playbackUrl;
    videoEl.load();
    videoShellEl.focus();
    updateFullscreenUi();
    updateProgressVisual();
    updateSpeedOptionsUi();
    scheduleControlsAutoHide();
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
          <h2 class="text-lg font-semibold mb-4">Lecture Attachments</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            ${pdfs.map((pdf, index) => `
              <a href="${sanitizeUrl(pdf.link)}" target="_blank" rel="noopener" class="p-3.5 rounded-xl border border-white/10 bg-slate-900/70 hover:bg-slate-800 transition">
                <p class="text-xs text-cyan-200/70">Attachment ${index + 1}</p>
                <p class="text-sm font-semibold mt-1">${escapeHtml(pdf.title || 'PDF')}</p>
                <p class="text-xs text-cyan-300/80 mt-1">Open in new tab</p>
              </a>
            `).join('')}
          </div>
        </div>
      `;
      return;
    }

    const rawVideoLink = String(activeLecture.videoLink || '').trim();
    if (!rawVideoLink) {
      playerPanelEl.innerHTML = '<div class="h-full flex items-center justify-center text-sm text-white/60">No video link available for this lecture.</div>';
      return;
    }

    const embedUrl = getEmbedUrl(rawVideoLink);
    if (embedUrl) {
      playerPanelEl.innerHTML = `
        <div class="h-full flex flex-col">
          <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
            <p class="text-sm font-semibold truncate">${escapeHtml(activeLecture.title || 'Lecture')}</p>
            <span class="text-[11px] px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-100 border border-cyan-400/30">Embedded Player</span>
          </div>
          <div class="flex-1 bg-black">
            <iframe
              src="${embedUrl}"
              class="w-full h-full"
              title="${escapeHtml(activeLecture.title || 'Lecture video')}"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"
            ></iframe>
          </div>
        </div>
      `;
      return;
    }

    playerPanelEl.setAttribute('tabindex', '0');
    renderVideoPanel();
  }

  function renderLectureList() {
    const lectures = Array.isArray(course?.lectures) ? course.lectures : [];
    const filtered = lectures.filter((lecture) => {
      if (!lectureSearchQuery) return true;
      const text = String(lecture?.title || '').toLowerCase();
      return text.includes(lectureSearchQuery);
    });

    if (!filtered.length) {
      lectureListEl.innerHTML = '<div class="text-xs text-white/55 border border-white/10 rounded-xl p-3">No lecture found for your search.</div>';
      return;
    }

    lectureListEl.innerHTML = filtered
      .map((lecture) => {
        const index = lectures.findIndex((entry) => String(entry?._id) === String(lecture?._id));
        const isActive = String(lecture._id) === String(activeLecture?._id);
        const pdfCount = Array.isArray(lecture?.pdfs) ? lecture.pdfs.length : 0;
        return `
          <button
            type="button"
            data-lecture-id="${lecture._id}"
            class="pwplayer-lecture ${isActive ? 'active' : ''} w-full text-left rounded-xl border border-white/10 px-3 py-2.5 transition"
          >
            <p class="text-xs text-white/50">Lecture ${index + 1}</p>
            <p class="text-sm font-medium mt-0.5">${escapeHtml(lecture.title || 'Untitled')}</p>
            <p class="text-[11px] text-white/50 mt-1">${lecture.videoLink ? 'Video available' : 'No video'} | ${pdfCount} attachments</p>
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
    const lectures = Array.isArray(course?.lectures) ? course.lectures : [];
    if (lessonStatsEl) {
      lessonStatsEl.textContent = `${lectures.length} Lessons`;
    }

    setTabUi();
    renderLectureList();
    renderPanel();
    updateNavButtons();
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

  if (lectureSearchEl) {
    lectureSearchEl.addEventListener('input', (event) => {
      lectureSearchQuery = String(event.target?.value || '').trim().toLowerCase();
      renderLectureList();
    });
  }

  if (prevLectureBtn) {
    prevLectureBtn.addEventListener('click', () => {
      const lectures = Array.isArray(course?.lectures) ? course.lectures : [];
      const index = getActiveLectureIndex();
      if (index <= 0) return;
      activeLecture = lectures[index - 1] || activeLecture;
      renderAll();
    });
  }

  if (nextLectureBtn) {
    nextLectureBtn.addEventListener('click', () => {
      const lectures = Array.isArray(course?.lectures) ? course.lectures : [];
      const index = getActiveLectureIndex();
      if (index === -1 || index >= lectures.length - 1) return;
      activeLecture = lectures[index + 1] || activeLecture;
      renderAll();
    });
  }

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

function sanitizeUrl(link) {
  const value = String(link || '').trim();
  if (!value) return '#';

  if (value.startsWith('/')) return value;
  if (/^https?:\/\//i.test(value)) return value;

  return '#';
}
