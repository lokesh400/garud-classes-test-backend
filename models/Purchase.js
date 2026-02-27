const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  testSeries: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSeries',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentId: {
    type: String,
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success',
  },
  method: {
    type: String,
    default: 'online',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  details: {
    type: Object,
    default: {},
  },
});

module.exports = mongoose.model('Purchase', purchaseSchema);
