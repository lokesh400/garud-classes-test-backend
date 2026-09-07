const mongoose = require('mongoose');
const saarthiDbConnection = require('../config/db-saarthi');

const saarthiMessageSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      required: true,
      enum: ['student', 'sme', 'admin', 'teacher', 'coordinator'],
    },
    messageType: {
      type: String,
      enum: ['text', 'image'],
      default: 'text',
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = saarthiDbConnection.model('SaarthiMessage', saarthiMessageSchema);
