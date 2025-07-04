// // models/AdCampaign.js
const mongoose = require('mongoose');
const adCampaignSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaignId: String,
  adSetId: String,
  adId: String,
  campaignName: String,
  objective: {
    type: String,
    enum: ['REACH', 'TRAFFIC', 'ENGAGEMENT','OUTCOME_AWARENESS',
    'OUTCOME_TRAFFIC',
    'OUTCOME_ENGAGEMENT',
    'OUTCOME_LEADS',
    'OUTCOME_SALES',
    'OUTCOME_APP_PROMOTION']
  },
  budget: {
    amount: Number,
    currency: String
  },
  targeting: {
    ageMin: Number,
    ageMax: Number,
    genders: [String],
    locations: [String],
    interests: [String]
  },
  creative: {
    imageUrl: String,
    headline: String,
    description: String,
    callToAction: String
  },
  schedule: {
    startTime: Date, 
    endTime: Date   
  },
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'DELETED','SCHEDULED']
  }
});
module.exports = mongoose.model('AdCampaign', adCampaignSchema);
