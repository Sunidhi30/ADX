const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  adSetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdSet',
    required: true
  },
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
    enum: ['google_ads', 'meta_ads'],
    required: true
  },
  adType: {
    type: String,
    enum: ['text', 'image', 'video', 'carousel', 'collection', 'responsive_search', 'responsive_display'],
    required: true
  },
  content: {
    headlines: [String],
    descriptions: [String],
    callToAction: String,
    displayUrl: String,
    finalUrl: String,
    images: [{
      url: String,
      alt: String,
      dimensions: {
        width: Number,
        height: Number
      }
    }],
    videos: [{
      url: String,
      thumbnail: String,
      duration: Number
    }]
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'deleted', 'under_review', 'approved', 'disapproved'],
    default: 'under_review'
  },
  platformAdIds: {
    googleAdsId: String,
    metaAdsId: String
  },
  performance: {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    cost: {
      type: Number,
      default: 0
    },
    ctr: {
      type: Number,
      default: 0
    },
    cpc: {
      type: Number,
      default: 0
    },
    cpm: {
      type: Number,
      default: 0
    },
    lastUpdated: Date
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

module.exports = mongoose.model('Ad', adSchema);
