const express = require('express');
const Purchase = require('../models/Purchase');
const { auth } = require('../middleware/auth');
const router = express.Router();

/**
 * Helper — resolves a Mongoose model by itemType string.
 * Add new cases here as new purchasable types are introduced.
 */
function resolveModel(itemType) {
  switch (itemType) {
    case 'TestSeries': return require('../models/TestSeries');
    default: return null;
  }
}

// ─── Check if the current user has purchased a specific item ─────────────────
// GET /api/purchase/check?itemType=TestSeries&itemId=<id>
router.get('/check', auth, async (req, res) => {
  try {
    const { itemType, itemId } = req.query;
    if (!itemType || !itemId) return res.status(400).json({ message: 'itemType and itemId are required' });
    const purchase = await Purchase.findOne({
      user: req.user._id,
      itemType,
      itemId,
      status: 'success',
    });
    res.json({ purchased: !!purchase, purchase: purchase || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Get all successful purchases for the current user ───────────────────────
// GET /api/purchase/my?itemType=TestSeries   (itemType filter is optional)
router.get('/my', auth, async (req, res) => {
  try {
    const query = { user: req.user._id, status: 'success' };
    if (req.query.itemType) query.itemType = req.query.itemType;
    const purchases = await Purchase.find(query)
      .populate('itemId')   // refPath auto-selects the right model
      .sort({ createdAt: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Admin: get all purchases for a specific item ────────────────────────────
// GET /api/purchase/item/:itemType/:itemId
router.get('/item/:itemType/:itemId', auth, async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const purchases = await Purchase.find({ itemType, itemId, status: 'success' })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
