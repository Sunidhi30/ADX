const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true // e.g., 'Basic', 'Premium'
  },
  price: {
    type: Number,
    required: true
  },
  durationInDays: {
    type: Number, // e.g., 30 for monthly, 365 for yearly
    required: true
  },
  features: [String], // optional list of feature descriptions
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
