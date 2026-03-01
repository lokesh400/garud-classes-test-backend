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
    console.log('[CREATE ORDER] Body:', req.body, 'User:', req.user?._id);
    const { seriesId } = req.body;
    const series = await TestSeries.findById(seriesId);
    if (!series) {
      console.log('[CREATE ORDER] Series not found');
      return res.status(404).json({ message: 'Test series not found' });
    }
    if (series.price === 0) {
      console.log('[CREATE ORDER] Series is free');
      return res.status(400).json({ message: 'Test series is free' });
    }
    // Razorpay receipt must be <= 40 chars
    const shortReceipt = `series_${seriesId}`.slice(0, 30) + `_${Date.now()}`.slice(0, 10);
    const order = await razorpay.orders.create({
      amount: series.price * 100, // INR paise
      currency: 'INR',
      receipt: shortReceipt,
      payment_capture: 1,
    });
    console.log('[CREATE ORDER] Order created:', order);
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error('[CREATE ORDER] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Verify payment and grant access
router.post('/verify', auth, async (req, res) => {
  try {
    console.log('[VERIFY] Body:', req.body, 'User:', req.user?._id);
    const { seriesId, paymentId } = req.body;
    const series = await TestSeries.findById(seriesId);
    if (!series) {
      console.log('[VERIFY] Series not found');
      return res.status(404).json({ message: 'Test series not found' });
    }
    if (series.price === 0) {
      console.log('[VERIFY] Series is free');
      return res.status(400).json({ message: 'Test series is free' });
    }
    // Optionally verify payment with Razorpay API
    // For demo, just grant access
    // purchasedBy logic removed; rely on Purchase model only
    // Record purchase
    const Purchase = require('../models/Purchase');
    const purchase = await Purchase.create({
      user: req.user._id,
      testSeries: seriesId,
      amount: series.price,
      paymentId,
      status: 'success',
      method: 'online',
      details: {},
    });
    console.log('[VERIFY] Purchase created:', purchase);
    res.json({ success: true });
  } catch (error) {
    console.error('[VERIFY] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Free access route
router.post('/free-access', auth, async (req, res) => {
  try {
    console.log('[FREE ACCESS] Body:', req.body, 'User:', req.user?._id);
    const { seriesId } = req.body;
    const series = await TestSeries.findById(seriesId);
    if (!series) {
      console.log('[FREE ACCESS] Series not found');
      return res.status(404).json({ message: 'Test series not found' });
    }
    if (series.price !== 0) {
      console.log('[FREE ACCESS] Series is not free');
      return res.status(400).json({ message: 'Test series is not free' });
    }
    // purchasedBy logic removed; rely on Purchase model only
    // Record free purchase
    const Purchase = require('../models/Purchase');
    const purchase = await Purchase.create({
      user: req.user._id,
      testSeries: seriesId,
      amount: 0,
      status: 'success',
      method: 'free',
      details: {},
    });
    console.log('[FREE ACCESS] Purchase created:', purchase);
    res.json({ success: true });
  } catch (error) {
    console.error('[FREE ACCESS] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
