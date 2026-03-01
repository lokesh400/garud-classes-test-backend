const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    immutable: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['admin', 'student'],
    default: 'student',
  },
  class: {
    type: String,
    required: false,
    trim: true,
  },
  targetExam: {
    type: String,
    required: false,
    trim: true,
  },
  mobile: {
    type: String,
    required: false,
    trim: true,
  },
  address: {
    type: String,
    required: false,
    trim: true,
  },
  // Quick-access list of purchased TestSeries ids.
  // Source of truth is the Purchase collection; this is a denormalised cache
  // for fast "has this user bought X?" checks without extra DB queries.
  purchasedSeries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSeries',
  }],
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
