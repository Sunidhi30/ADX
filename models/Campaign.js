const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['google_ads', 'meta_ads', 'both'],
    required: true
  },
  campaignType: {
    type: String,
    enum: ['search', 'display', 'video', 'shopping', 'lead_generation', 'traffic', 'brand_awareness', 'conversions'],
    required: true
  },
  objective: {
    type: String,
    enum: ['leads', 'sales', 'traffic', 'brand_awareness', 'engagement'],
    required: true
  },
  budget: {
    dailyBudget: {
      type: Number,
      required: true
    },
    totalBudget: Number,
    currency: {
      type: String,
      default: 'INR'
    }
  },
  targeting: {
    demographics: {
      ageMin: Number,
      ageMax: Number,
      gender: {
        type: String,
        enum: ['all', 'male', 'female']
      }
    },
    location: {
      countries: [String],
      states: [String],
      cities: [String],
      radius: Number
    },
    interests: [String],
    keywords: [String],
    customAudience: String
  },
  adSets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdSet'
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  platformCampaignIds: {
    googleAdsId: String,
    metaAdsId: String
  },
  schedule: {
    startDate: Date,
    endDate: Date,
    timezone: String
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

module.exports = mongoose.model('Campaign', campaignSchema);
