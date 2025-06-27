const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad'
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  source: {
    type: String,
    enum: ['google_ads', 'meta_ads', 'organic', 'direct', 'whatsapp', 'form'],
    required: true
  },
  contactInfo: {
    name: String,
    email: String,
    phone: String,
    company: String
  },
  leadData: {
    formFields: mongoose.Schema.Types.Mixed,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    referrer: String,
    ipAddress: String,
    userAgent: String
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
    default: 'new'
  },
  tags: [String],
  notes: String,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  followUpDate: Date,
  conversionValue: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Lead', leadSchema);
