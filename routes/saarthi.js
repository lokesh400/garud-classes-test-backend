const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const SaarthiBatch = require('../models/SaarthiBatch');
const SaarthiMessage = require('../models/SaarthiMessage');
const { uploadToSaarthiCloud } = require('../config/cloudinary');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to check if user has access to a specific Saarthi batch
const checkSaarthiAccess = async (req, res, next) => {
  try {
    const batchId = req.params.batchId;
    const user = req.user;

    if (user.role === 'admin' || user.role === 'coordinator') {
      return next(); // Admins have full access
    }

    const batch = await SaarthiBatch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    if (user.role === 'sme') {
      if (batch.assignedSmes && batch.assignedSmes.includes(user._id)) {
        return next();
      }
      return res.status(403).json({ message: 'Not assigned to this batch' });
    }

    if (user.role === 'student') {
      const dbUser = await User.findById(user._id);
      if (dbUser.purchasedSaarthi && dbUser.purchasedSaarthi.includes(batchId)) {
        return next();
      }
      return res.status(403).json({ message: 'You are not enrolled in this Saarthi program' });
    }

    return res.status(403).json({ message: 'Unauthorized role' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 1. Get messages for a batch
router.get('/:batchId/messages', auth, checkSaarthiAccess, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    
    let studentId = req.query.studentId;
    if (!studentId) {
      if (req.user.role === 'student') studentId = req.user._id.toString();
      else return res.status(400).json({ message: 'studentId is required for SMEs' });
    }

    const messages = await SaarthiMessage.find({ batchId: req.params.batchId, studentId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    // Reverse so oldest is first for the UI
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Post a new message
router.post('/:batchId/messages', auth, checkSaarthiAccess, upload.single('image'), async (req, res) => {
  try {
    let { content, studentId } = req.body;
    let messageContent = content;
    let messageType = 'text';

    if (!studentId) {
      if (req.user.role === 'student') studentId = req.user._id.toString();
      else return res.status(400).json({ message: 'studentId is required for SMEs' });
    }

    if (req.file) {
      const uploadResult = await uploadToSaarthiCloud(req.file.buffer);
      messageContent = uploadResult.secure_url;
      messageType = 'image';
    } else if (!content) {
      return res.status(400).json({ message: 'Content or image is required' });
    }

    const newMessage = new SaarthiMessage({
      batchId: req.params.batchId,
      studentId,
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      messageType,
      content: messageContent,
    });

    const savedMessage = await newMessage.save();

    // Broadcast to the specific batch+student room
    const saarthiIo = req.app.get('saarthiIo');
    if (saarthiIo) {
      saarthiIo.to(`saarthi_${req.params.batchId}_${studentId}`).emit('newMessage', savedMessage);
    }

    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Toggle Meet (Admin / SME only)
router.post('/:batchId/toggle-meet', auth, checkSaarthiAccess, async (req, res) => {
  try {
    if (req.user.role === 'student') {
      return res.status(403).json({ message: 'Students cannot toggle meet' });
    }

    const { isMeetActive } = req.body;
    const batch = await SaarthiBatch.findById(req.params.batchId);
    
    batch.isMeetActive = isMeetActive;
    if (isMeetActive) {
      // Generate a new unguessable Jitsi room name each time it starts
      batch.jitsiRoomName = `garud-saarthi-${crypto.randomUUID()}`;
    } else {
      batch.jitsiRoomName = null;
    }

    await batch.save();

    // Broadcast meet status change to all clients in the room
    const saarthiIo = req.app.get('saarthiIo');
    if (saarthiIo) {
      saarthiIo.to(`saarthi_${req.params.batchId}`).emit('meetStatusChanged', {
        isMeetActive: batch.isMeetActive,
      });
    }

    res.json({ message: 'Meet status updated', isMeetActive: batch.isMeetActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Get Meet Room Info (Only allowed if active and enrolled)
router.get('/:batchId/meet-info', auth, checkSaarthiAccess, async (req, res) => {
  try {
    const batch = await SaarthiBatch.findById(req.params.batchId);
    if (!batch.isMeetActive || !batch.jitsiRoomName) {
      return res.status(404).json({ message: 'No active meet for this batch' });
    }
    // SMEs and Admins can always get it, Students only if active (which we checked above)
    res.json({ jitsiRoomName: batch.jitsiRoomName, subject: batch.title });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
