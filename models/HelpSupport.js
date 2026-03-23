const mongoose = require('mongoose');

const HelpSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open',
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Help', HelpSchema);
