const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  name: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,
    default: ""
  },
  role: {
    type: String,

    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Admin', adminSchema);
