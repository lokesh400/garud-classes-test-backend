const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
}, { timestamps: true });

// Compound index so chapter name is unique within a subject
chapterSchema.index({ name: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Chapter', chapterSchema);
