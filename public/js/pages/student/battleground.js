document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  const loadingEl = document.getElementById('battleground-loading');
  const errorEl = document.getElementById('battleground-error');
  const contentEl = document.getElementById('battleground-content');

  const streakCurrentEl = document.getElementById('streak-current');
  const streakBestEl = document.getElementById('streak-best');
  const streakProgressEl = document.getElementById('streak-progress');
  const streakDateEl = document.getElementById('streak-date');

  function showError(message) {
    loadingEl.classList.add('hidden');
    contentEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    errorEl.textContent = message;
  }

  function toLabel(value) {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function formatDate(dateKey) {
    if (!dateKey) return '-';
    const parsed = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateKey;
    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function buildProgressLabel(progress) {
    if (!progress) return '-';

    if (progress.requirementType === 'senior-pcm-or-pcb') {
      const compulsory = progress.compulsoryAttempted?.join(', ') || 'none';
      const optional = progress.optionalAttempted?.join(', ') || 'none';
      return `Compulsory: ${compulsory} | Optional: ${optional}`;
    }

    return progress.qualifiesForStreak ? 'Attempt done for today' : 'No attempts yet';
  }

  function renderQuizCard(item, submission) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5';

    const isSubmitted = !!submission;
    const resultBadge = isSubmitted
      ? `<span class="px-2 py-1 rounded-md text-xs font-semibold ${submission.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${submission.isCorrect ? 'Correct' : 'Incorrect'}</span>`
      : '<span class="px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">Pending</span>';

    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-gray-900">${toLabel(item.subjectKey)}</h3>
          <p class="text-xs text-gray-500 mt-1">Class: ${toLabel(item.classLevel)} | Type: ${toLabel(item.questionType)}</p>
        </div>
        ${resultBadge}
      </div>

      <div class="mt-3 rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
        <img src="${item.imageUrl}" alt="${toLabel(item.subjectKey)} question" class="w-full h-auto" />
      </div>

      <form class="subject-answer-form mt-4 flex flex-col sm:flex-row gap-2" data-subject="${item.subjectKey}">
        <input type="text" name="answer" ${isSubmitted ? 'disabled' : ''} value="${isSubmitted ? (submission.answerRaw || '') : ''}" placeholder="Enter your answer" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <button type="submit" ${isSubmitted ? 'disabled' : ''} class="px-3 py-2 rounded-lg text-sm font-semibold text-white ${isSubmitted ? 'bg-slate-400' : 'bg-garud-highlight hover:opacity-95'}">${isSubmitted ? 'Submitted' : 'Submit'}</button>
      </form>
    `;

    const form = card.querySelector('.subject-answer-form');
    if (!isSubmitted) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const answer = String(formData.get('answer') || '').trim();
        if (!answer) {
          toast.error('Please enter an answer');
          return;
        }

        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = 'Submitting...';

        try {
          await API.post('/battlegrounds/submit', {
            quizId: item._id,
            subjectKey: item.subjectKey,
            answer,
          });
          toast.success(`${toLabel(item.subjectKey)} answer submitted`);
          await loadBattleground();
        } catch (error) {
          toast.error(error.message || 'Failed to submit answer');
        } finally {
          button.disabled = false;
          button.textContent = 'Submit';
        }
      });
    }

    return card;
  }

  async function loadBattleground() {
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');

    try {
      const data = await API.get('/battlegrounds/frontend/today');

      streakCurrentEl.textContent = String(data.streak?.currentStreak || 0);
      streakBestEl.textContent = String(data.streak?.bestStreak || 0);
      streakProgressEl.textContent = buildProgressLabel(data.progress);
      streakDateEl.textContent = formatDate(data.dateKey);

      const submissionsByQuizId = new Map(
        (data.submittedSubjects || []).map((item) => [String(item.quizId || ''), item])
      );

      contentEl.innerHTML = '';
      if (!Array.isArray(data.quizzes) || !data.quizzes.length) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-sm text-gray-500';
        emptyEl.textContent = 'No battleground quizzes are posted for today.';
        contentEl.appendChild(emptyEl);
      } else {
        data.quizzes.forEach((quiz) => {
          const submission = submissionsByQuizId.get(String(quiz._id)) || null;
          contentEl.appendChild(renderQuizCard(quiz, submission));
        });
      }

      loadingEl.classList.add('hidden');
      contentEl.classList.remove('hidden');
    } catch (error) {
      showError(error.message || 'Failed to load battleground');
    }
  }

  await loadBattleground();
});
