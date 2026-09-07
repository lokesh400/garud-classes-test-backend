const mongoose = require('mongoose');

const saarthiBatchSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    validity: {
      type: Number, // validity in days
      required: true,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    thumbnail: {
      type: String,
    },
    assignedSmes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    jitsiRoomName: {
      type: String,
      default: null,
    },
    isMeetActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SaarthiBatch', saarthiBatchSchema);
