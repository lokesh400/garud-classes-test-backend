const mongoose = require('mongoose');

const testSeriesSchema = new mongoose.Schema({
    image: {
      type: String,
      default: '',
    },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  tests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
  }],
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchasedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    tags: [{
      type: String,
      trim: true,
    }],
    madeFor: {
      type: String,
      enum: ['jee', 'neet', 'other'],
      default: 'other',
    },
  isPublished: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

module.exports = mongoose.model('TestSeries', testSeriesSchema);
