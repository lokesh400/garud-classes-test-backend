const mongoose = require('mongoose');

/**
 * Generic Purchase schema.
 *
 * itemType  — the Mongoose model name of the purchased item, e.g. 'TestSeries'.
 *             Add more values to the enum as new purchasable types are introduced.
 * itemId    — ObjectId of the purchased document. Uses refPath so Mongoose can
 *             auto-populate the correct collection based on itemType.
 *
 * Razorpay fields are stored explicitly so that payment verification and
 * reconciliation never have to dig through a free-form `details` blob.
 */
const purchaseSchema = new mongoose.Schema(
  {
    // ── who bought it ──────────────────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ── what was bought ────────────────────────────────────────────────────────
    itemType: {
      type: String,
      required: true,
      enum: ['TestSeries', 'Course'], // extend here: 'Book', etc.
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'itemType', // auto-selects the right model for .populate('item')
      index: true,
    },

    // ── payment details ────────────────────────────────────────────────────────
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ['online', 'free'],
      default: 'online',
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'pending',
    },

    // ── Razorpay specifics (null for free purchases) ───────────────────────────
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },

    // ── catch-all for future metadata ─────────────────────────────────────────
    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

// Compound index: quickly check "has user X purchased item Y?"
purchaseSchema.index({ user: 1, itemId: 1, status: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
