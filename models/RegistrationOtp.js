const mongoose = require('mongoose');

const registrationOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '10m' }, // automatically delete documents after expiration time
  },
}, { timestamps: true });

module.exports = mongoose.model('RegistrationOtp', registrationOtpSchema);
