const express = require('express');
const Question = require('../../models/Question');
const { auth, adminOnly } = require('../../middleware/auth');
const { BattlegroundQuiz } = require('../../models/Battleground');

const router = express.Router();

const APP_TIMEZONE = 'Asia/Kolkata';
const SUBJECT_KEYS = ['physics', 'chemistry', 'mathematics', 'biology'];

function getDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

function normalizeSubjectKey(value) {
  return String(value || '').trim().toLowerCase();
}

router.post('/quiz', auth, adminOnly, async (req, res) => {
  try {
    const { classLevel, subjectKey, questionId, date } = req.body;

    const normalizedClass = String(classLevel || '').trim();
    if (!normalizedClass) {
      return res.status(400).json({ message: 'classLevel is required' });
    }

    if (!questionId) {
      return res.status(400).json({ message: 'questionId is required' });
    }

    const normalizedSubject = normalizeSubjectKey(subjectKey);
    if (!SUBJECT_KEYS.includes(normalizedSubject)) {
      return res.status(400).json({
        message: `subjectKey must be one of: ${SUBJECT_KEYS.join(', ')}`,
      });
    }

    const dateKey = String(date || getDateKey()).trim();

    const question = await Question.findById(questionId).lean();
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const quiz = await BattlegroundQuiz.findOneAndUpdate(
      { classLevel: normalizedClass, dateKey, subjectKey: normalizedSubject },
      {
        classLevel: normalizedClass,
        subjectKey: normalizedSubject,
        dateKey,
        question: question._id,
        imageUrl: question.imageUrl,
        questionType: question.type,
        createdBy: req.user._id,
        isActive: true,
      },
      { new: true, upsert: true }
    ).populate('question', 'imageUrl type subject chapter topic');

    res.status(201).json(quiz);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        message:
          'Duplicate battleground entry for this class/date/subject. If this happens for different subjects, drop old Mongo index classLevel_1_dateKey_1.',
      });
    }
    res.status(500).json({ message: error.message });
  }
});

router.get('/quiz', auth, adminOnly, async (req, res) => {
  try {
    const classLevel = String(req.query.classLevel || '').trim();
    const subjectKey = normalizeSubjectKey(req.query.subjectKey || '');
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();

    const filter = {};
    if (classLevel) filter.classLevel = classLevel;
    if (subjectKey) filter.subjectKey = subjectKey;
    if (from || to) {
      filter.dateKey = {};
      if (from) filter.dateKey.$gte = from;
      if (to) filter.dateKey.$lte = to;
    }

    const quizzes = await BattlegroundQuiz.find(filter)
      .populate('question', 'imageUrl type subject chapter topic')
      .populate('createdBy', 'name')
      .sort({ dateKey: -1, subjectKey: 1, createdAt: -1 })
      .lean();

    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
