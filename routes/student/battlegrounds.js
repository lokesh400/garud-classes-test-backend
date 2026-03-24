const express = require('express');
const Question = require('../../models/Question');
const { auth } = require('../../middleware/auth');
const {
  BattlegroundQuiz,
  BattlegroundSubmission,
  BattlegroundStreak,
} = require('../../models/Battleground');

const router = express.Router();

const APP_TIMEZONE = 'Asia/Kolkata';
const SUBJECT_KEYS = ['physics', 'chemistry', 'mathematics', 'biology'];
const SUBJECT_ORDER = { physics: 1, chemistry: 2, mathematics: 3, biology: 4 };

function getDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

function dateKeyToUtcDayMs(dateKey) {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return NaN;
  return Date.UTC(year, month - 1, day);
}

function dayDifference(aDateKey, bDateKey) {
  const a = dateKeyToUtcDayMs(aDateKey);
  const b = dateKeyToUtcDayMs(bDateKey);
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  return Math.round((b - a) / 86400000);
}

function normalizeClassLevel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';

  if (normalized.includes('drop')) return 'dropper';

  const match = normalized.match(/(^|\D)(9|10|11|12)(\D|$)/);
  if (match?.[2]) return match[2];

  return normalized;
}

function buildClassLevelAliases(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const normalized = normalizeClassLevel(raw);
  const aliases = new Set([raw, raw.toLowerCase(), normalized]);

  if (/^(9|10|11|12)$/.test(normalized)) {
    aliases.add(`Class ${normalized}`);
    aliases.add(`class ${normalized}`);
    aliases.add(`${normalized}th`);
  }

  if (normalized === 'dropper') {
    aliases.add('Dropper');
    aliases.add('dropper');
  }

  return Array.from(aliases).filter(Boolean);
}

function normalizeSubjectKey(value) {
  return String(value || '').trim().toLowerCase();
}

function getStreakRequirement(classLevel) {
  return {
    compulsory: ['physics', 'chemistry'],
    oneOf: ['mathematics', 'biology'],
    type: 'senior-pcm-or-pcb',
  };
}

function buildSubmissionMap(submissions) {
  return new Map((submissions || []).map((submission) => [submission.subjectKey, submission]));
}

function evaluateDailyQualification(classLevel, submissions) {
  const requirement = getStreakRequirement(classLevel);
  const map = buildSubmissionMap(submissions);

  if (requirement.type === 'any-subject') {
    return {
      requirement,
      compulsoryAttempted: [],
      optionalAttempted: [],
      qualifiesForStreak: map.size > 0,
    };
  }

  const compulsoryAttempted = requirement.compulsory.filter((subject) => map.has(subject));
  const optionalAttempted = requirement.oneOf.filter((subject) => map.has(subject));

  return {
    requirement,
    compulsoryAttempted,
    optionalAttempted,
    qualifiesForStreak:
      compulsoryAttempted.length === requirement.compulsory.length && optionalAttempted.length >= 1,
  };
}

function normalizeOptionAnswer(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeMsqAnswer(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeOptionAnswer(item)).filter(Boolean).sort();
  }

  return String(value || '')
    .split(/[\s,]+/)
    .map((item) => normalizeOptionAnswer(item))
    .filter(Boolean)
    .sort();
}

function validateAnswer(question, answer) {
  if (!question) return false;

  if (question.type === 'mcq') {
    const expected = normalizeOptionAnswer(question.correctOption);
    return expected && normalizeOptionAnswer(answer) === expected;
  }

  if (question.type === 'msq') {
    const expected = Array.isArray(question.correctOptions)
      ? question.correctOptions.map((opt) => normalizeOptionAnswer(opt)).filter(Boolean).sort()
      : [];
    const actual = normalizeMsqAnswer(answer);

    if (!expected.length || expected.length !== actual.length) return false;
    return expected.every((value, index) => value === actual[index]);
  }

  if (question.type === 'numerical') {
    const expected = Number(question.correctNumericalAnswer);
    const actual = Number(String(answer || '').trim());
    if (Number.isNaN(expected) || Number.isNaN(actual)) return false;
    return Math.abs(expected - actual) < 1e-9;
  }

  return false;
}

async function getOrCreateStreak(userId, classLevel) {
  return BattlegroundStreak.findOneAndUpdate(
    { user: userId, classLevel },
    { $setOnInsert: { user: userId, classLevel } },
    { new: true, upsert: true }
  );
}

async function resetIfMissedDay(streak, todayDateKey) {
  if (!streak?.lastSubmittedDateKey) return streak;

  const gap = dayDifference(streak.lastSubmittedDateKey, todayDateKey);
  if (!Number.isNaN(gap) && gap > 1 && streak.currentStreak !== 0) {
    streak.currentStreak = 0;
    await streak.save();
  }

  return streak;
}

async function getTodayResponsePayload(req) {
  const classLevel = String(req.user.class || '').trim();
  const classAliases = buildClassLevelAliases(classLevel);

  const todayDateKey = getDateKey();
  const quizFilter = {
    dateKey: todayDateKey,
    isActive: true,
  };
  const submissionFilter = {
    user: req.user._id,
    dateKey: todayDateKey,
  };

  const [quizzes, submissions] = await Promise.all([
    BattlegroundQuiz.find(quizFilter)
      .sort({ classLevel: 1, subjectKey: 1, createdAt: 1 })
      .lean(),
    BattlegroundSubmission.find(submissionFilter)
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  let streak = {
    currentStreak: 0,
    bestStreak: 0,
    totalAttempts: 0,
    totalCorrect: 0,
    totalQualifiedDays: 0,
  };
  let qualification = {
    requirement: { type: 'any-subject', compulsory: [], oneOf: [] },
    compulsoryAttempted: [],
    optionalAttempted: [],
    qualifiesForStreak: false,
  };

  const normalizedClassLevel = normalizeClassLevel(classLevel);

  if (normalizedClassLevel) {
    const userStreak = await getOrCreateStreak(req.user._id, normalizedClassLevel);
    await resetIfMissedDay(userStreak, todayDateKey);
    streak = {
      currentStreak: userStreak.currentStreak,
      bestStreak: userStreak.bestStreak,
      totalAttempts: userStreak.totalAttempts,
      totalCorrect: userStreak.totalCorrect,
      totalQualifiedDays: userStreak.totalQualifiedDays,
    };

    const classScopedSubmissions = classAliases.length
      ? submissions.filter((submission) => classAliases.includes(String(submission.classLevel || '').trim()))
      : submissions;
    qualification = evaluateDailyQualification(normalizedClassLevel, classScopedSubmissions);
  }

  const quizItems = quizzes
    .map((quiz) => ({
      _id: quiz._id,
      classLevel: quiz.classLevel,
      subjectKey: quiz.subjectKey,
      imageUrl: quiz.imageUrl,
      questionType: quiz.questionType,
    }))
    .sort((a, b) => (SUBJECT_ORDER[a.subjectKey] || 999) - (SUBJECT_ORDER[b.subjectKey] || 999));

  return {
    status: 200,
    body: {
      dateKey: todayDateKey,
      classLevel,
      quizzes: quizItems,
      battlegrounds: quizItems,
      totalBattlegrounds: quizItems.length,
      submittedSubjects: submissions.map((submission) => ({
        quizId: submission.quiz,
        classLevel: submission.classLevel,
        subjectKey: submission.subjectKey,
        answerRaw: submission.answerRaw,
        isCorrect: submission.isCorrect,
        submittedAt: submission.createdAt,
      })),
      progress: {
        requirementType: qualification.requirement.type,
        compulsorySubjects: qualification.requirement.compulsory,
        optionalSubjects: qualification.requirement.oneOf,
        compulsoryAttempted: qualification.compulsoryAttempted,
        optionalAttempted: qualification.optionalAttempted,
        qualifiesForStreak: qualification.qualifiesForStreak,
      },
      streak,
    },
  };
}

router.get('/today', auth, async (req, res) => {
  try {
    const payload = await getTodayResponsePayload(req);
    res.status(payload.status).json(payload.body);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/frontend/today', auth, async (req, res) => {
  try {
    const payload = await getTodayResponsePayload(req);
    res.status(payload.status).json(payload.body);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/submit', auth, async (req, res) => {
  try {
    const classLevelRaw = String(req.user.class || '').trim();
    const normalizedClassLevel = normalizeClassLevel(classLevelRaw);
    const classAliases = buildClassLevelAliases(classLevelRaw);
    if (!normalizedClassLevel) {
      return res.status(400).json({ message: 'Student class is not set on profile' });
    }

    const quizId = String(req.body.quizId || '').trim();
    let subjectKey = normalizeSubjectKey(req.body.subjectKey);

    const answer = req.body.answer;
    if (answer === undefined || answer === null || String(answer).trim() === '') {
      return res.status(400).json({ message: 'answer is required' });
    }

    const todayDateKey = getDateKey();

    let quiz = null;
    if (quizId) {
      quiz = await BattlegroundQuiz.findOne({
        _id: quizId,
        dateKey: todayDateKey,
        isActive: true,
      }).lean();
      subjectKey = quiz ? quiz.subjectKey : subjectKey;
    } else {
      if (!SUBJECT_KEYS.includes(subjectKey)) {
        return res.status(400).json({
          message: `quizId is required (or subjectKey must be one of: ${SUBJECT_KEYS.join(', ')})`,
        });
      }

      quiz = await BattlegroundQuiz.findOne({
        dateKey: todayDateKey,
        subjectKey,
        isActive: true,
      })
        .sort({ createdAt: 1 })
        .lean();
    }

    if (!quiz) {
      return res.status(404).json({ message: `No ${subjectKey} battleground quiz posted for today` });
    }

    subjectKey = normalizeSubjectKey(quiz.subjectKey);

    const alreadySubmitted = await BattlegroundSubmission.findOne({
      user: req.user._id,
      quiz: quiz._id,
    }).lean();

    if (alreadySubmitted) {
      return res.status(409).json({ message: `You have already submitted this ${subjectKey} battleground` });
    }

    const question = await Question.findById(quiz.question).lean();
    if (!question) {
      return res.status(500).json({ message: 'Linked question not found for this quiz' });
    }

    const isCorrect = validateAnswer(question, answer);

    try {
      await BattlegroundSubmission.create({
        quiz: quiz._id,
        user: req.user._id,
        classLevel: quiz.classLevel,
        subjectKey,
        dateKey: todayDateKey,
        answerRaw: String(answer).trim(),
        isCorrect,
      });
    } catch (createError) {
      if (createError?.code === 11000) {
        return res.status(409).json({ message: `You have already submitted this ${subjectKey} battleground` });
      }
      throw createError;
    }

    const streak = await getOrCreateStreak(req.user._id, normalizedClassLevel);
    await resetIfMissedDay(streak, todayDateKey);

    const todaySubmissions = await BattlegroundSubmission.find({
      user: req.user._id,
      dateKey: todayDateKey,
    }).lean();

    const classScopedSubmissions = classAliases.length
      ? todaySubmissions.filter((submission) => classAliases.includes(String(submission.classLevel || '').trim()))
      : todaySubmissions;

    const qualification = evaluateDailyQualification(normalizedClassLevel, classScopedSubmissions);
    const alreadyQualifiedToday = streak.lastQualifiedDateKey === todayDateKey;

    streak.totalAttempts += 1;
    if (isCorrect) streak.totalCorrect += 1;

    if (qualification.qualifiesForStreak && !alreadyQualifiedToday) {
      const gap = streak.lastQualifiedDateKey
        ? dayDifference(streak.lastQualifiedDateKey, todayDateKey)
        : NaN;
      const isContinuation = !Number.isNaN(gap) && gap === 1;

      streak.currentStreak = isContinuation ? streak.currentStreak + 1 : 1;
      streak.bestStreak = Math.max(streak.bestStreak, streak.currentStreak);
      streak.totalQualifiedDays += 1;
      streak.lastQualifiedDateKey = todayDateKey;
    }

    streak.lastSubmittedDateKey = todayDateKey;
    await streak.save();

    res.json({
      dateKey: todayDateKey,
      quizId: quiz._id,
      classLevel: quiz.classLevel,
      subjectKey,
      isCorrect,
      qualifiesForStreakToday: qualification.qualifiesForStreak,
      streak: {
        currentStreak: streak.currentStreak,
        bestStreak: streak.bestStreak,
        totalAttempts: streak.totalAttempts,
        totalCorrect: streak.totalCorrect,
        totalQualifiedDays: streak.totalQualifiedDays,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const classLevelRaw = String(req.user.class || '').trim();
    const normalizedClassLevel = normalizeClassLevel(classLevelRaw);
    if (!normalizedClassLevel) {
      return res.status(400).json({ message: 'Student class is not set on profile' });
    }

    const todayDateKey = getDateKey();
    const streak = await getOrCreateStreak(req.user._id, normalizedClassLevel);
    await resetIfMissedDay(streak, todayDateKey);

    res.json({
      classLevel: normalizedClassLevel,
      dateKey: todayDateKey,
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      totalAttempts: streak.totalAttempts,
      totalCorrect: streak.totalCorrect,
      totalQualifiedDays: streak.totalQualifiedDays,
      lastSubmittedDateKey: streak.lastSubmittedDateKey,
      lastQualifiedDateKey: streak.lastQualifiedDateKey,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
