const mongoose = require('mongoose');

const lecturePdfSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true }
);

const lectureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    videoLink: {
      type: String,
      default: '',
      trim: true,
    },
    pdfs: {
      type: [lecturePdfSchema],
      default: [],
    },
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    image: {
      type: String,
      default: '',
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    madeFor: {
      type: String,
      enum: ['jee', 'neet', 'other'],
      default: 'other',
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    lectures: {
      type: [lectureSchema],
      default: [],
    },
    purchasedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

courseSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
