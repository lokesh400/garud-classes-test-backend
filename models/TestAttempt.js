const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  // For MCQ
  selectedOption: {
    type: String,
    enum: ['A', 'B', 'C', 'D', null],
    default: null,
  },
  // For Numerical
  numericalAnswer: {
    type: Number,
    default: null,
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
  marksObtained: {
    type: Number,
    default: 0,
  },
}, { _id: true });

const testAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
  },
  answers: [answerSchema],
  totalScore: {
    type: Number,
    default: 0,
  },
  maxScore: {
    type: Number,
    default: 0,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  submittedAt: {
    type: Date,
  },
  isSubmitted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Prevent duplicate attempts
testAttemptSchema.index({ user: 1, test: 1 }, { unique: true });

module.exports = mongoose.model('TestAttempt', testAttemptSchema);
