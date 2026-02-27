const mongoose = require('mongoose');

const sectionQuestionSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  positiveMarks: {
    type: Number,
    default: 4,
  },
  negativeMarks: {
    type: Number,
    default: 1,
  },
}, { _id: true });

const sectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  questions: [sectionQuestionSchema],
}, { _id: true });

const testSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  duration: {
    type: Number, // in minutes
    required: true,
  },
  sections: [sectionSchema],
  isPublished: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);
