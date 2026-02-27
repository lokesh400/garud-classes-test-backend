const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  // Question image from Cloudinary
  imageUrl: {
    type: String,
    required: true,
  },
  imagePublicId: {
    type: String,
    required: true,
  },
  // Question type
  type: {
    type: String,
    enum: ['mcq', 'numerical'],
    required: true,
  },
  // For MCQ: correct option (A, B, C, or D)
  correctOption: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: function () {
      return this.type === 'mcq';
    },
  },
  // For Numerical: correct numerical answer
  correctNumericalAnswer: {
    type: Number,
    required: function () {
      return this.type === 'numerical';
    },
  },
  // Hierarchy
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true,
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
