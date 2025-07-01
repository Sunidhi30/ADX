// 3. Transaction schema for payment records

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentId: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['subscription', 'rental', 'purchase'],
    required: true
  },
  itemReference: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'itemModel'
  },
  itemModel: {
    type: String,
    enum: ['SubscriptionPlan', 'Content'],
    required: true
  }
}, { timestamps: true });

module.exports  = mongoose.model('Transaction', transactionSchema);
