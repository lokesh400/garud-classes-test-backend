const express = require('express');
const Topic = require('../models/Topic');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get topics by chapter
router.get('/chapter/:chapterId', auth, async (req, res) => {
  try {
    const topics = await Topic.find({ chapter: req.params.chapterId })
      .populate({
        path: 'chapter',
        populate: { path: 'subject', select: 'name' },
      })
      .sort({ name: 1 });
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all topics
router.get('/', auth, async (req, res) => {
  try {
    const topics = await Topic.find()
      .populate({
        path: 'chapter',
        populate: { path: 'subject', select: 'name' },
      })
      .sort({ name: 1 });
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create topic (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, chapter } = req.body;
    const topic = new Topic({ name, chapter });
    await topic.save();
    const populated = await topic.populate({
      path: 'chapter',
      populate: { path: 'subject', select: 'name' },
    });
    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Topic already exists in this chapter' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update topic
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const topic = await Topic.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    ).populate({
      path: 'chapter',
      populate: { path: 'subject', select: 'name' },
    });
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    res.json(topic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete topic
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const topic = await Topic.findByIdAndDelete(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    res.json({ message: 'Topic deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
