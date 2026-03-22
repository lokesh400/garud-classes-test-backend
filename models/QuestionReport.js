const mongoose = require('mongoose');

const questionReportSchema = new mongoose.Schema(
  {
    question:  { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    test:      { type: mongoose.Schema.Types.ObjectId, ref: 'Test',     required: true },
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    // What the student thinks the correct answer is
    reportedOptions:         { type: [String], default: [] }, // for MCQ / MSQ
    reportedNumericalAnswer: { type: Number,   default: null },
    comment:   { type: String, default: '', maxlength: 500 },
    status:    { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuestionReport', questionReportSchema);
