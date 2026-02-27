const express = require('express');
const Purchase = require('../models/Purchase');
const TestSeries = require('../models/TestSeries');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get all purchases for a user
router.get('/my', auth, async (req, res) => {
  try {
    const purchases = await Purchase.find({ user: req.user._id }).populate('testSeries');
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Record purchase after payment
router.post('/record', auth, async (req, res) => {
  try {
    const { seriesId, amount, paymentId, status, method, details } = req.body;
    const series = await TestSeries.findById(seriesId);
    if (!series) return res.status(404).json({ message: 'Test series not found' });
    const purchase = new Purchase({
      user: req.user._id,
      testSeries: seriesId,
      amount,
      paymentId,
      status: status || 'success',
      method: method || 'online',
      details: details || {},
    });
    await purchase.save();
    res.json({ success: true, purchase });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Record free access as purchase
router.post('/record-free', auth, async (req, res) => {
  try {
    const { seriesId } = req.body;
    const series = await TestSeries.findById(seriesId);
    if (!series) return res.status(404).json({ message: 'Test series not found' });
    const purchase = new Purchase({
      user: req.user._id,
      testSeries: seriesId,
      amount: 0,
      status: 'success',
      method: 'free',
      details: {},
    });
    await purchase.save();
    res.json({ success: true, purchase });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
