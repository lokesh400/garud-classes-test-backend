const express = require('express');
const router  = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const QuestionReport = require('../models/QuestionReport');

// ── POST /api/reports — submit a question report ──────────────────
router.post('/', auth, async (req, res) => {
  try {
    const {
      questionId,
      testId,
      reportedOptions,
      reportedNumericalAnswer,
      comment,
    } = req.body;

    if (!questionId || !testId) {
      return res.status(400).json({ message: 'questionId and testId are required' });
    }

    const report = await QuestionReport.create({
      question:  questionId,
      test:      testId,
      user:      req.user._id,
      reportedOptions:         reportedOptions || [],
      reportedNumericalAnswer: reportedNumericalAnswer ?? null,
      comment:   (comment || '').trim().slice(0, 500),
    });

    res.status(201).json({ message: 'Report submitted successfully', reportId: report._id });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/reports — admin: list all reports ────────────────────
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const reports = await QuestionReport.find()
      .populate('question', 'imageUrl type correctOption correctOptions correctNumericalAnswer')
      .populate('test',     'name')
      .populate('user',     'name email')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/reports/:id — admin: update status ─────────────────
router.patch('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const report = await QuestionReport.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
