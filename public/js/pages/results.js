/**
 * pages/results.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('student');
  if (!user) return;

  const testId = window.location.pathname.split('/')[3]; // /student/results/:testId

  try {
    const { attempt: result, test } = await API.get(`/tests/${testId}/my-result`);

    const pct          = result.maxScore > 0 ? ((result.totalScore / result.maxScore) * 100).toFixed(1) : 0;
    const totalAnswered = result.answers.filter(a => a.selectedOption || a.numericalAnswer !== null).length;
    const totalCorrect  = result.answers.filter(a => a.isCorrect).length;
    const totalWrong    = totalAnswered - totalCorrect;

    document.getElementById('test-title').textContent    = `${test.name} — Results`;
    document.getElementById('submitted-at').textContent  = `Submitted: ${new Date(result.submittedAt).toLocaleString()}`;

    document.getElementById('score-cards').innerHTML = [
      { label: 'Score',      val: `${result.totalScore}/${result.maxScore}`,  cls: 'text-garud-accent' },
      { label: 'Percentage', val: `${pct}%`,                                  cls: pct >= 60 ? 'text-green-600' : 'text-red-600' },
      { label: 'Correct',    val: totalCorrect,                               cls: 'text-green-600' },
      { label: 'Wrong',      val: totalWrong,                                 cls: 'text-red-600' },
    ].map(c => `
      <div class="bg-white rounded-xl shadow-md p-5 text-center">
        <p class="text-sm text-gray-500">${c.label}</p>
        <p class="text-3xl font-bold ${c.cls} mt-1">${c.val}</p>
      </div>`).join('');

    document.getElementById('sections-review').innerHTML = test.sections.map((section, sIdx) => `
      <div class="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
        <div class="bg-gray-50 px-6 py-4 border-b">
          <h3 class="font-bold text-gray-800">Section ${sIdx + 1}: ${section.name}</h3>
        </div>
        <div class="p-6 space-y-6">
          ${section.questions.map((qEntry, qIdx) => {
            const q      = qEntry.question;
            const answer = result.answers.find(a => a.question?._id === q._id && a.sectionId === section._id);
            const bgColor = answer?.isCorrect
              ? 'bg-green-500'
              : (answer?.selectedOption || answer?.numericalAnswer !== null) ? 'bg-red-500' : 'bg-gray-400';

            return `
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-start gap-4">
                  <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${bgColor}">
                    ${qIdx + 1}
                  </div>
                  <div class="flex-1">
                    <img src="${q.imageUrl}" alt="Q${qIdx+1}"
                         class="max-h-48 object-contain rounded border bg-gray-50 mb-3"/>
                    <div class="flex flex-wrap gap-4 text-sm">
                      ${q.type === 'mcq' ? `
                        <div class="flex items-center gap-1">
                          <span class="text-gray-500">Your answer:</span>
                          <span class="font-bold ${answer?.isCorrect ? 'text-green-600' : 'text-red-600'}">
                            ${answer?.selectedOption || 'Not answered'}
                          </span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span class="text-gray-500">Correct answer:</span>
                          <span class="font-bold text-green-600">${q.correctOption}</span>
                        </div>` : `
                        <div class="flex items-center gap-1">
                          <span class="text-gray-500">Your answer:</span>
                          <span class="font-bold ${answer?.isCorrect ? 'text-green-600' : 'text-red-600'}">
                            ${answer?.numericalAnswer !== null && answer?.numericalAnswer !== undefined ? answer.numericalAnswer : 'Not answered'}
                          </span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span class="text-gray-500">Correct:</span>
                          <span class="font-bold text-green-600">${q.correctNumericalAnswer}</span>
                        </div>`}

                      <div class="flex items-center gap-1">
                        <span class="text-gray-500">Marks:</span>
                        <span class="font-bold ${answer?.marksAwarded > 0 ? 'text-green-600' : answer?.marksAwarded < 0 ? 'text-red-600' : 'text-gray-500'}">
                          ${answer?.marksAwarded !== undefined ? (answer.marksAwarded > 0 ? '+' : '') + answer.marksAwarded : '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`).join('');

  } catch {
    toast.error('No results found');
    window.location.href = '/student/dashboard';
  } finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
  }
});
