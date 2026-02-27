const express = require('express');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const Question = require('../models/Question');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ==================== ADMIN ROUTES ====================

// Get all tests (admin)
router.get('/admin/all', auth, adminOnly, async (req, res) => {
  try {
    const tests = await Test.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create test (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, duration, sections } = req.body;
    const test = new Test({
      name,
      description,
      duration,
      sections: sections || [],
      createdBy: req.user._id,
    });
    await test.save();
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single test (admin - full details)
router.get('/admin/:id', auth, adminOnly, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate({
        path: 'sections.questions.question',
        populate: [
          { path: 'subject', select: 'name' },
          { path: 'chapter', select: 'name' },
          { path: 'topic', select: 'name' },
        ],
      })
      .populate('createdBy', 'name');

    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update test (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, duration, isPublished } = req.body;
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { name, description, duration, isPublished },
      { new: true }
    );
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete test (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    // Also delete all attempts
    await TestAttempt.deleteMany({ test: req.params.id });
    res.json({ message: 'Test deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add section to test
router.post('/:id/sections', auth, adminOnly, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    test.sections.push({ name: req.body.name, questions: [] });
    await test.save();
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove section from test
router.delete('/:testId/sections/:sectionId', auth, adminOnly, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    test.sections = test.sections.filter(
      (s) => s._id.toString() !== req.params.sectionId
    );
    await test.save();
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add question to section
router.post('/:testId/sections/:sectionId/questions', auth, adminOnly, async (req, res) => {
  try {
    const { questionId, positiveMarks, negativeMarks } = req.body;
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const section = test.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    // Check if question already exists in this section
    const exists = section.questions.some(
      (q) => q.question.toString() === questionId
    );
    if (exists) {
      return res.status(400).json({ message: 'Question already in this section' });
    }

    section.questions.push({
      question: questionId,
      positiveMarks: positiveMarks || 4,
      negativeMarks: negativeMarks || 1,
    });
    await test.save();

    // Return populated test
    const populated = await Test.findById(test._id).populate({
      path: 'sections.questions.question',
      populate: [
        { path: 'subject', select: 'name' },
        { path: 'chapter', select: 'name' },
        { path: 'topic', select: 'name' },
      ],
    });
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove question from section
router.delete(
  '/:testId/sections/:sectionId/questions/:questionEntryId',
  auth,
  adminOnly,
  async (req, res) => {
    try {
      const test = await Test.findById(req.params.testId);
      if (!test) return res.status(404).json({ message: 'Test not found' });

      const section = test.sections.id(req.params.sectionId);
      if (!section) return res.status(404).json({ message: 'Section not found' });

      section.questions = section.questions.filter(
        (q) => q._id.toString() !== req.params.questionEntryId
      );
      await test.save();

      const populated = await Test.findById(test._id).populate({
        path: 'sections.questions.question',
        populate: [
          { path: 'subject', select: 'name' },
          { path: 'chapter', select: 'name' },
          { path: 'topic', select: 'name' },
        ],
      });
      res.json(populated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Get test results/attempts (admin)
router.get('/:id/results', auth, adminOnly, async (req, res) => {
  try {
    const attempts = await TestAttempt.find({ test: req.params.id, isSubmitted: true })
      .populate('user', 'name email')
      .sort({ totalScore: -1 });
    res.json(attempts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== STUDENT ROUTES ====================

// Get published tests (student)
router.get('/published', auth, async (req, res) => {
  try {
    const tests = await Test.find({ isPublished: true })
      .select('name description duration sections createdAt')
      .sort({ createdAt: -1 });

    // Add question count and check if already attempted
    const testsWithInfo = await Promise.all(
      tests.map(async (test) => {
        const attempt = await TestAttempt.findOne({
          user: req.user._id,
          test: test._id,
        });
        const totalQuestions = test.sections.reduce(
          (acc, s) => acc + s.questions.length,
          0
        );
        return {
          _id: test._id,
          name: test.name,
          description: test.description,
          duration: test.duration,
          totalQuestions,
          sectionCount: test.sections.length,
          attempted: !!attempt,
          isSubmitted: attempt?.isSubmitted || false,
          createdAt: test.createdAt,
        };
      })
    );

    res.json(testsWithInfo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start test attempt (student)
router.post('/:id/start', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate(
      'sections.questions.question'
    );
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!test.isPublished) return res.status(400).json({ message: 'Test is not published' });

    // Check existing attempt
    let attempt = await TestAttempt.findOne({
      user: req.user._id,
      test: test._id,
    });

    if (attempt && attempt.isSubmitted) {
      return res.status(400).json({ message: 'You have already submitted this test' });
    }

    if (!attempt) {
      // Calculate max score
      let maxScore = 0;
      test.sections.forEach((section) => {
        section.questions.forEach((q) => {
          maxScore += q.positiveMarks;
        });
      });

      attempt = new TestAttempt({
        user: req.user._id,
        test: test._id,
        answers: [],
        maxScore,
        startedAt: new Date(),
      });
      await attempt.save();
    }

    // Return test without correct answers
    const testData = {
      _id: test._id,
      name: test.name,
      description: test.description,
      duration: test.duration,
      sections: test.sections.map((section) => ({
        _id: section._id,
        name: section.name,
        questions: section.questions.map((q) => ({
          _id: q._id,
          question: {
            _id: q.question._id,
            imageUrl: q.question.imageUrl,
            type: q.question.type,
          },
          positiveMarks: q.positiveMarks,
          negativeMarks: q.negativeMarks,
        })),
      })),
    };

    res.json({
      test: testData,
      attempt: {
        _id: attempt._id,
        startedAt: attempt.startedAt,
        answers: attempt.answers,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save answer (student - auto-save)
router.post('/:id/answer', auth, async (req, res) => {
  try {
    const { questionId, sectionId, selectedOption, numericalAnswer } = req.body;

    const attempt = await TestAttempt.findOne({
      user: req.user._id,
      test: req.params.id,
      isSubmitted: false,
    });

    if (!attempt) {
      return res.status(400).json({ message: 'No active attempt found' });
    }

    // Find or create answer
    const existingIdx = attempt.answers.findIndex(
      (a) => a.question.toString() === questionId && a.sectionId.toString() === sectionId
    );

    const answerData = {
      question: questionId,
      sectionId,
      selectedOption: selectedOption || null,
      numericalAnswer: numericalAnswer !== undefined ? numericalAnswer : null,
    };

    if (existingIdx >= 0) {
      attempt.answers[existingIdx] = { ...attempt.answers[existingIdx].toObject(), ...answerData };
    } else {
      attempt.answers.push(answerData);
    }

    await attempt.save();
    res.json({ message: 'Answer saved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit test (student)
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const attempt = await TestAttempt.findOne({
      user: req.user._id,
      test: req.params.id,
      isSubmitted: false,
    });

    if (!attempt) {
      return res.status(400).json({ message: 'No active attempt found' });
    }

    const test = await Test.findById(req.params.id).populate(
      'sections.questions.question'
    );

    // Grade each answer
    let totalScore = 0;
    for (const answer of attempt.answers) {
      const section = test.sections.find(
        (s) => s._id.toString() === answer.sectionId.toString()
      );
      if (!section) continue;

      const questionEntry = section.questions.find(
        (q) => q.question._id.toString() === answer.question.toString()
      );
      if (!questionEntry) continue;

      const question = questionEntry.question;
      let isCorrect = false;

      if (question.type === 'mcq' && answer.selectedOption) {
        isCorrect = answer.selectedOption === question.correctOption;
      } else if (question.type === 'numerical' && answer.numericalAnswer !== null) {
        isCorrect = Math.abs(answer.numericalAnswer - question.correctNumericalAnswer) < 0.01;
      }

      answer.isCorrect = isCorrect;
      answer.marksObtained = isCorrect
        ? questionEntry.positiveMarks
        : answer.selectedOption || answer.numericalAnswer !== null
        ? -questionEntry.negativeMarks
        : 0;

      totalScore += answer.marksObtained;
    }

    attempt.totalScore = totalScore;
    attempt.isSubmitted = true;
    attempt.submittedAt = new Date();
    await attempt.save();

    res.json({
      totalScore: attempt.totalScore,
      maxScore: attempt.maxScore,
      answers: attempt.answers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my result for a test
router.get('/:id/my-result', auth, async (req, res) => {
  try {
    const attempt = await TestAttempt.findOne({
      user: req.user._id,
      test: req.params.id,
      isSubmitted: true,
    }).populate({
      path: 'answers.question',
      select: 'imageUrl type correctOption correctNumericalAnswer',
    });

    if (!attempt) {
      return res.status(404).json({ message: 'No submitted attempt found' });
    }

    const test = await Test.findById(req.params.id)
      .select('name description duration sections')
      .populate({
        path: 'sections.questions.question',
        select: 'imageUrl type correctOption correctNumericalAnswer',
      });

    res.json({ attempt, test });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
