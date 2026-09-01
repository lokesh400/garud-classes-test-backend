const express = require('express');
const TestSeries = require('../models/TestSeries');
const TestAttempt = require('../models/TestAttempt');
const Purchase = require('../models/Purchase');
const User = require('../models/User');
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
        select: 'name description duration isPublished sections scheduledAt mode syllabus testType',
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

router.post('/admin/:id/add-student', auth, adminOnly, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const series = await TestSeries.findById(req.params.id);
    if (!series) return res.status(404).json({ message: 'Test series not found' });

    const existing = await Purchase.findOne({ user: user._id, itemType: 'TestSeries', itemId: series._id, status: 'success' });
    if (existing) return res.status(400).json({ message: 'User is already enrolled in this test series' });

    await Purchase.create({
      user: user._id,
      itemType: 'TestSeries',
      itemId: series._id,
      amount: 0,
      method: 'manual',
      status: 'success'
    });

    await TestSeries.findByIdAndUpdate(series._id, { $addToSet: { purchasedBy: user._id } });
    await User.findByIdAndUpdate(user._id, { $addToSet: { purchasedSeries: series._id } });

    res.json({ message: 'Student enrolled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create test series (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, price, tags, madeFor, image, visibility } = req.body;
    const series = new TestSeries({
      name,
      description,
      price: price || 0,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      madeFor: madeFor || 'other',
      image: image || '',
      visibility: visibility || 'all',
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
    const { name, description, isPublished, visibility } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (isPublished !== undefined) update.isPublished = isPublished;
    if (visibility !== undefined) update.visibility = visibility;

    const series = await TestSeries.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('createdBy', 'name')
      .populate({
        path: 'tests',
        select: 'name description duration isPublished sections scheduledAt mode syllabus testType',
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
        select: 'name description duration isPublished sections scheduledAt mode syllabus testType',
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
        select: 'name description duration isPublished sections scheduledAt mode syllabus testType',
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
    const minimal = req.query.minimal === 'true' || req.query.fields === 'basic';
    let query = {};
    if (req.user && req.user.role === 'admin') {
      // admin sees all
    } else if (req.user) {
      query = {
        isPublished: true,
        $or: [
          { visibility: 'all' },
          { visibility: { $ne: 'admin_only' }, purchasedBy: req.user._id }
        ]
      };
    } else {
      query = { isPublished: true, visibility: 'all' };
    }

    if (minimal) {
      const basicSeries = await TestSeries.find(query)
        .select('_id image name description')
        .sort({ createdAt: -1 })
        .lean();

      return res.json(basicSeries);
    }

    const seriesList = await TestSeries.find(query)
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
  console.log('Fetching test series for student:', req.params.id);
  try {
    let query = { _id: req.params.id };
    if (!req.user || req.user.role !== 'admin') {
      query.isPublished = true;
      query.visibility = { $ne: 'admin_only' };
    }
    const series = await TestSeries.findOne(query)
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


////////////////////////////////////////////
///////////////////////////////////////////

router.get('/my-purchase', auth, async (req, res) => {
  console.log('Fetching test series purchases for user:', req.user._id);
  try {
    const me = await require('../models/User').findById(req.user._id);
    if (!me) return res.status(404).json({ message: 'User not found' });
    const p = me.purchasedSeries;
    console.log('Purchased series IDs from user document:', p);

    const purchases = await TestSeries.find({ _id: { $in: p } })
      .select('_id name description image');
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
