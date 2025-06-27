const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['hotel', 'real_estate', 'restaurant', 'retail', 'salon', 'gym', 'general'],
    required: true
  },
  platform: {
    type: String,
    enum: ['google_ads', 'meta_ads', 'both'],
    required: true
  },
  adType: {
    type: String,
    enum: ['text', 'image', 'video', 'carousel'],
    required: true
  },
  template: {
    headlines: [String],
    descriptions: [String],
    callToAction: String,
    images: [String],
    targeting: {
      interests: [String],
      keywords: [String],
      demographics: mongoose.Schema.Types.Mixed
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Template', templateSchema);