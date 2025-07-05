//models/Lead.js - Updated Schema
const mongoose = require('mongoose');
const leadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  //Connect lead to specific ad campaign
  adCampaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdCampaign',
    required: true
  },
  //Track which platform the lead came from
  source: {
    type: String,
    enum: ['facebook_ads', 'google_ads'],
    required: true
  },
  //Store the original ad ID from the platform
  platformAdId: {
    type: String,
    required: true
  },
  // Lead information
  contactInfo: {
    name: String,
    email: String,
    phone: String,
    company: String
  },
  //Additional lead data
  leadData: {
    formFields: mongoose.Schema.Types.Mixed,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    referrer: String,
    ipAddress: String,
    userAgent: String
  },
  //status
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