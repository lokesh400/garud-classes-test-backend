const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true,
  },
}, { timestamps: true });

// Compound index so topic name is unique within a chapter
topicSchema.index({ name: 1, chapter: 1 }, { unique: true });

module.exports = mongoose.model('Topic', topicSchema);
