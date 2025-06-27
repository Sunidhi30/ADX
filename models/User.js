// models/User.js
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },

  otp: {
    code: String,
    expiresAt: Date
  },
  businessName: {
    type: String,
    required: true
  },
  businessType: {
    type: String,
    enum: ['hotel', 'real_estate', 'restaurant', 'retail', 'salon', 'gym', 'other'],
    required: true
  },
  businessDetails: {
    address: String,
    city: String,
    state: String,
    country: String,
    phone: String,
    website: String,
    logo: String
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  integrations: {
    googleAds: {
      isConnected: {
        type: Boolean,
        default: false
      },
      customerId: String,
      refreshToken: String,
      accessToken: String,
      tokenExpiry: Date
    },
    metaAds: {
      isConnected: {
        type: Boolean,
        default: false
      },
      adAccountId: String,
      accessToken: String,
      tokenExpiry: Date,
      pageId: String,
      businessId: String
    },
    whatsapp: {
      isConnected: {
        type: Boolean,
        default: false
      },
      phoneNumberId: String,
      accessToken: String
    }
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
module.exports = mongoose.model('User', userSchema);