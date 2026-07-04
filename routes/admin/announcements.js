const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../../middleware/auth');
const Announcement = require('../../models/Announcement');
const User = require('../../models/User');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

// Fetch announcements (optional for admin to view past announcements)
router.get('/', auth, adminOnly, async (req, res, next) => {
  try {
    const announcements = await Announcement.find()
      .populate('batchId', 'name title')
      .populate('authorId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(announcements);
  } catch (err) {
    next(err);
  }
});

// Create announcement
router.post('/', auth, adminOnly, async (req, res, next) => {
  try {
    const { title, message, batchId } = req.body;

    if (!title || !message || !batchId) {
      return res.status(400).json({ message: 'Title, message, and batch ID are required.' });
    }

    const announcement = new Announcement({
      title,
      message,
      batchId,
      authorId: req.user._id,
    });

    await announcement.save();

    // Fetch all students in this batch who have an expo push token
    // We check if the user's batches array contains the batchId
    // or if they purchased a course/series related to this batch (depends on exact logic, assuming batches array for now)
    const users = await User.find({
      batches: batchId,
      expoPushTokens: { $exists: true, $not: { $size: 0 } }
    }).select('expoPushTokens');

    const tokens = [];
    for (const user of users) {
      tokens.push(...user.expoPushTokens);
    }

    // Deduplicate tokens
    const uniqueTokens = [...new Set(tokens)];

    const messages = [];
    for (let pushToken of uniqueTokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        continue;
      }
      messages.push({
        to: pushToken,
        sound: 'default',
        title: title,
        body: message,
        data: { withSome: 'data', batchId },
      });
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    // We send push notifications asynchronously, not waiting for completion to respond to the request
    (async () => {
      for (let chunk of chunks) {
        try {
          let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push chunk:', error);
        }
      }
    })();

    res.status(201).json({ 
      message: 'Announcement created and notifications queued.',
      announcement,
      targetTokensCount: uniqueTokens.length
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
