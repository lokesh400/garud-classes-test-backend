const express = require('express');
const Chapter = require('../models/Chapter');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get chapters by subject
router.get('/subject/:subjectId', auth, async (req, res) => {
  try {
    const chapters = await Chapter.find({ subject: req.params.subjectId })
      .populate('subject', 'name')
      .sort({ name: 1 });
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all chapters
router.get('/', auth, async (req, res) => {
    console.log('Fetching all chapters');
  try {
    const chapters = await Chapter.find()
      .populate('subject', 'name')
      .sort({ name: 1 });
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create chapter (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, subject } = req.body;
    const chapter = new Chapter({ name, subject });
    await chapter.save();
    const populated = await chapter.populate('subject', 'name');
    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Chapter already exists in this subject' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update chapter
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const chapter = await Chapter.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    ).populate('subject', 'name');
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });
    res.json(chapter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete chapter
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const chapter = await Chapter.findByIdAndDelete(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });
    res.json({ message: 'Chapter deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
