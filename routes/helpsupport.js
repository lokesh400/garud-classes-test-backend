const express = require('express');
const Help = require('../models/HelpSupport');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message is required' });
    }
    const helpRequest = new Help({
      message: message.trim(),
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

module.exports = router;
