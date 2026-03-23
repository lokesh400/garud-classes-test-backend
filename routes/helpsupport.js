const express = require('express');
const Help = require('../models/HelpSupport');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message is required' });
    }
    const helpRequest = new Help({
      message: message.trim(),
      status: 'open',
      createdBy: req.user._id,
    });
    await helpRequest.save();
    res.status(201).json({ message: 'Help request submitted successfully', helpRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const helpRequests = await Help.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(helpRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: list all help requests, optionally filter by status=open|closed.
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const status = String(req.query.status || '').trim().toLowerCase();
    const query = {};
    if (status === 'open' || status === 'closed') {
      query.status = status;
    }

    const helpRequests = await Help.find(query)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json(helpRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: update ticket status.
router.patch('/:id/status', auth, adminOnly, async (req, res) => {
  try {
    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'status must be open or closed' });
    }

    const helpRequest = await Help.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('createdBy', 'name email role');

    if (!helpRequest) {
      return res.status(404).json({ message: 'Help request not found' });
    }

    res.json({ message: 'Help request status updated', helpRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
