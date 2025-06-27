const mongoose = require('mongoose');

const adSetSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['google_ads', 'meta_ads'],
    required: true
  },
  budget: {
    dailyBudget: Number,
    bidStrategy: String,
    bidAmount: Number
  },
  targeting: {
    demographics: {
      ageMin: Number,
      ageMax: Number,
      gender: String
    },
    location: {
      countries: [String],
      cities: [String],
      radius: Number
    },
    interests: [String],
    keywords: [String],
    placements: [String]
  },
  ads: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad'
  }],
  status: {
    type: String,
    enum: ['active', 'paused', 'deleted'],
    default: 'active'
  },
  platformAdSetIds: {
    googleAdsId: String,
    metaAdsId: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AdSet', adSetSchema);
