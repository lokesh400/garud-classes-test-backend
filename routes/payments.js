const express = require('express');
const Razorpay = require('razorpay');
const TestSeries = require('../models/TestSeries');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Setup Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order for test series purchase
router.post('/create-order', auth, async (req, res) => {
  try {
    const { seriesId } = req.body;
    const series = await TestSeries.findById(seriesId);
    if (!series) return res.status(404).json({ message: 'Test series not found' });
    if (series.price === 0) return res.status(400).json({ message: 'Test series is free' });

    const order = await razorpay.orders.create({
      amount: series.price * 100, // INR paise
      currency: 'INR',
      receipt: `series_${seriesId}_${Date.now()}`,
      payment_capture: 1,
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify payment and grant access
router.post('/verify', auth, async (req, res) => {
  try {
    const { seriesId, paymentId } = req.body;
    const series = await TestSeries.findById(seriesId);
    if (!series) return res.status(404).json({ message: 'Test series not found' });
    if (series.price === 0) return res.status(400).json({ message: 'Test series is free' });

    // Optionally verify payment with Razorpay API
    // For demo, just grant access
    if (!series.purchasedBy.includes(req.user._id)) {
      series.purchasedBy.push(req.user._id);
      await series.save();
    }
    // Record purchase
    const Purchase = require('../models/Purchase');
    await Purchase.create({
      user: req.user._id,
      testSeries: seriesId,
      amount: series.price,
      paymentId,
      status: 'success',
      method: 'online',
      details: {},
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Free access route
router.post('/free-access', auth, async (req, res) => {
  try {
    const { seriesId } = req.body;
    const series = await TestSeries.findById(seriesId);
    if (!series) return res.status(404).json({ message: 'Test series not found' });
    if (series.price !== 0) return res.status(400).json({ message: 'Test series is not free' });
    if (!series.purchasedBy.includes(req.user._id)) {
      series.purchasedBy.push(req.user._id);
      await series.save();
    }
    // Record free purchase
    const Purchase = require('../models/Purchase');
    await Purchase.create({
      user: req.user._id,
      testSeries: seriesId,
      amount: 0,
      status: 'success',
      method: 'free',
      details: {},
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
