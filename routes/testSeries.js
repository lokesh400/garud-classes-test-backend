const express = require('express');
const TestSeries = require('../models/TestSeries');
const TestAttempt = require('../models/TestAttempt');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ==================== ADMIN ROUTES ====================

// Get all test series (admin)
router.get('/admin/all', auth, adminOnly, async (req, res) => {
  try {
    const series = await TestSeries.find()
      .populate('createdBy', 'name')
      .populate({
        path: 'tests',
        select: 'name duration isPublished sections',
      })
      .populate({
        path: 'purchasedBy',
        select: 'name email',
      })
      .sort({ createdAt: -1 });
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single test series (admin)
router.get('/admin/:id', auth, adminOnly, async (req, res) => {
  try {
    const series = await TestSeries.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate({
        path: 'tests',
        select: 'name description duration isPublished sections',
      });

    if (!series) return res.status(404).json({ message: 'Test series not found' });
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create test series (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;
    const series = new TestSeries({
      name,
      description,
      tests: [],
      createdBy: req.user._id,
    });
    await series.save();
    res.status(201).json(series);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update test series (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, isPublished } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (isPublished !== undefined) update.isPublished = isPublished;

    const series = await TestSeries.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('createdBy', 'name')
      .populate({
        path: 'tests',
        select: 'name description duration isPublished sections',
      });

    if (!series) return res.status(404).json({ message: 'Test series not found' });
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete test series (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const series = await TestSeries.findByIdAndDelete(req.params.id);
    if (!series) return res.status(404).json({ message: 'Test series not found' });
    res.json({ message: 'Test series deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add test to series (admin)
router.post('/:id/tests', auth, adminOnly, async (req, res) => {
  try {
    const { testId } = req.body;
    const series = await TestSeries.findById(req.params.id);
    if (!series) return res.status(404).json({ message: 'Test series not found' });

    // Check if test already in series
    if (series.tests.includes(testId)) {
      return res.status(400).json({ message: 'Test already in this series' });
    }

    series.tests.push(testId);
    await series.save();

    const populated = await TestSeries.findById(series._id)
      .populate('createdBy', 'name')
      .populate({
        path: 'tests',
        select: 'name description duration isPublished sections',
      });

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove test from series (admin)
router.delete('/:id/tests/:testId', auth, adminOnly, async (req, res) => {
  try {
    const series = await TestSeries.findById(req.params.id);
    if (!series) return res.status(404).json({ message: 'Test series not found' });

    series.tests = series.tests.filter((t) => t.toString() !== req.params.testId);
    await series.save();

    const populated = await TestSeries.findById(series._id)
      .populate('createdBy', 'name')
      .populate({
        path: 'tests',
        select: 'name description duration isPublished sections',
      });

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== STUDENT ROUTES ====================

// Get published test series (student)
router.get('/published', auth, async (req, res) => {
  try {
    const seriesList = await TestSeries.find({ isPublished: true })
      .populate({
        path: 'tests',
        match: { isPublished: true },
        select: 'name description duration sections',
      })
      .sort({ createdAt: -1 });

    // Add attempt info per test for the current student
    const result = await Promise.all(
      seriesList.map(async (series) => {
        const testsWithInfo = await Promise.all(
          series.tests.map(async (test) => {
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
            };
          })
        );

        return {
          _id: series._id,
          name: series.name,
          description: series.description,
          tests: testsWithInfo,
          createdAt: series.createdAt,
        };
      })
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single published test series (student)
router.get('/published/:id', auth, async (req, res) => {
  try {
    const series = await TestSeries.findOne({ _id: req.params.id, isPublished: true })
      .populate({
        path: 'tests',
        match: { isPublished: true },
        select: 'name description duration sections',
      });

    if (!series) return res.status(404).json({ message: 'Test series not found' });

    const testsWithInfo = await Promise.all(
      series.tests.map(async (test) => {
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
        };
      })
    );

    res.json({
      _id: series._id,
      name: series.name,
      description: series.description,
      tests: testsWithInfo,
      createdAt: series.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
