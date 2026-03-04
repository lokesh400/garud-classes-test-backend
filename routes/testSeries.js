const express = require('express');
const TestSeries = require('../models/TestSeries');
const TestAttempt = require('../models/TestAttempt');
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadToSubjectCloud } = require('../config/cloudinary');

const router = express.Router();

// ==================== ADMIN ROUTES ====================

// Upload banner image for a test series
router.post('/upload-banner', auth, adminOnly, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
    const result = await uploadToSubjectCloud(req.file.buffer, 'Physics', 'garud-series-banners');
    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
        select: 'name description duration isPublished sections scheduledAt mode syllabus',
      });

    if (!series) return res.status(404).json({ message: 'Test series not found' });

    // Fetch enrolled users with enrollment date from Purchase model
    const purchases = await require('../models/Purchase').find({ itemType: 'TestSeries', itemId: series._id, status: 'success' })
      .populate('user', 'name email');
    const enrolledUsers = purchases.map(p => ({
      _id: p.user._id,
      name: p.user.name,
      email: p.user.email,
      enrolledAt: p.createdAt
    }));

    res.json({ ...series.toObject(), enrolledUsers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create test series (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, price, tags, madeFor, image } = req.body;
    const series = new TestSeries({
      name,
      description,
      price: price || 0,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      madeFor: madeFor || 'other',
      image: image || '',
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
        select: 'name description duration sections scheduledAt mode syllabus testType',
      })
      .sort({ createdAt: -1 });

    // Add attempt info per test for the current student
    const result = await Promise.all(
      seriesList.map(async (series) => {
        const testsWithInfo = await Promise.all(
          series.tests.map(async (test) => {
            const submittedAttempt = await TestAttempt.findOne({
              user: req.user._id,
              test: test._id,
              isSubmitted: true,
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
              attempted: !!submittedAttempt,
              isSubmitted: submittedAttempt?.isSubmitted || false,
              scheduledAt: test.scheduledAt,
              mode: test.mode,
              syllabus: test.syllabus,
              testType: test.testType,
            };
          })
        );

        return {
          _id: series._id,
          name: series.name,
          description: series.description,
          price: series.price,
          tags: series.tags,
          madeFor: series.madeFor,
          image: series.image,
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
        select: 'name description duration sections scheduledAt mode syllabus testType',
      });

    if (!series) return res.status(404).json({ message: 'Test series not found' });

    const testsWithInfo = await Promise.all(
      series.tests.map(async (test) => {
        const submittedAttempt = await TestAttempt.findOne({
          user: req.user._id,
          test: test._id,
          isSubmitted: true,
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
          attempted: !!submittedAttempt,
          isSubmitted: submittedAttempt?.isSubmitted || false,
          scheduledAt: test.scheduledAt,
          mode: test.mode,
          syllabus: test.syllabus,
          testType: test.testType,
        };
      })
    );

    res.json({
      _id: series._id,
      name: series.name,
      description: series.description,
      price: series.price,
      tags: series.tags,
      madeFor: series.madeFor,
      image: series.image,
      tests: testsWithInfo,
      createdAt: series.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
