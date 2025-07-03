// models/AdCampaign.js
const mongoose = require('mongoose');

const adCampaignSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaignId: {
    type: String,
    unique: true,
    sparse: true
  },
  adSetId: {
    type: String,
    unique: true,
    sparse: true
  },
  adId: {
    type: String,
    unique: true,
    sparse: true
  },
  campaignName: {
    type: String,
    required: true
  },
  objective: {
    type: String,
    enum: ['REACH', 'TRAFFIC', 'ENGAGEMENT', 'LEAD_GENERATION', 'CONVERSIONS', 'BRAND_AWARENESS'],
    default: 'REACH'
  },
  budget: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  targeting: {
    ageMin: {
      type: Number,
      default: 18
    },
    ageMax: {
      type: Number,
      default: 65
    },
    genders: [{
      type: String,
      enum: ['male', 'female']
    }],
    locations: [{
      type: String
    }],
    interests: [{
      type: String
    }]
  },
  creative: {
    imageUrl: {
      type: String,
      required: true
    },
    headline: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    callToAction: {
      type: String,
      enum: ['LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'DOWNLOAD', 'CONTACT_US'],
      default: 'LEARN_MORE'
    },
    destinationUrl: String
  },
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'DELETED'],
    default: 'DRAFT'
  },
  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpm: { type: Number, defxault: 0 }
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

module.exports = mongoose.model('AdCampaign', adCampaignSchema);
