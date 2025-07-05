
const mongoose = require('mongoose');

const leadFormSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  fields: [{
    name: String,
    type: String,
    required: Boolean,
    options: [String]
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LeadForm', leadFormSchema);