const mongoose = require('mongoose');

const SUBJECT_KEYS = ['physics', 'chemistry', 'mathematics', 'biology'];

const battlegroundQuizSchema = new mongoose.Schema(
  {
    classLevel: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subjectKey: {
      type: String,
      enum: SUBJECT_KEYS,
      required: true,
      trim: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    questionType: {
      type: String,
      enum: ['mcq', 'numerical', 'msq'],
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

battlegroundQuizSchema.index({ classLevel: 1, dateKey: 1, subjectKey: 1 }, { unique: true });

const battlegroundSubmissionSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BattlegroundQuiz',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    classLevel: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subjectKey: {
      type: String,
      enum: SUBJECT_KEYS,
      required: true,
      trim: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    answerRaw: {
      type: String,
      required: true,
      trim: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// One user can submit each posted battleground quiz once.
battlegroundSubmissionSchema.index({ user: 1, quiz: 1 }, { unique: true });

const battlegroundStreakSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    classLevel: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    bestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCorrect: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalQualifiedDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastSubmittedDateKey: {
      type: String,
      default: '',
      trim: true,
    },
    lastQualifiedDateKey: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

battlegroundStreakSchema.index({ user: 1, classLevel: 1 }, { unique: true });

const BattlegroundQuiz = mongoose.model('BattlegroundQuiz', battlegroundQuizSchema);
const BattlegroundSubmission = mongoose.model('BattlegroundSubmission', battlegroundSubmissionSchema);
const BattlegroundStreak = mongoose.model('BattlegroundStreak', battlegroundStreakSchema);

module.exports = {
  BattlegroundQuiz,
  BattlegroundSubmission,
  BattlegroundStreak,
};
