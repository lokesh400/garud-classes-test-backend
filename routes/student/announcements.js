const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth');
const Announcement = require('../../models/Announcement');
const User = require('../../models/User');

// Fetch announcements for the logged-in student
router.get('/', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // A student might be enrolled in multiple batches, or we might fetch based on their purchased courses.
    // For now, we assume the `batches` array on the user model or they can fetch by passing batchId in query.
    // To make it flexible, if batchId is provided, fetch for that batch.
    // Else, fetch for all batches the user is enrolled in.

    const { batchId } = req.query;
    
    let query = {};
    if (batchId) {
      query.batchId = batchId;
    } else if (user.batches && user.batches.length > 0) {
      query.batchId = { $in: user.batches };
    } else {
      // If no batches, they don't have announcements (or we can return empty array)
      return res.json([]);
    }

    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .populate('authorId', 'name')
      .lean();

    res.json(announcements);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
