const express = require("express");
const router = express.Router();
const isUser = require("../middlewares/auth");
const upload = require("../middlewares/uploadBuffer");
const SubscriptionPlan = require("../models/SubscriptionPlan")
const User = require("../models/User");
const { uploadToCloudinary } = require("../utils/cloudinary");
const razorpay = require('../utils/razorpay');
const Transaction = require("../models/Transaction")
const crypto = require('crypto');

// GET /profile — fetch user profile
router.get("/profile", isUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select("-otp");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User profile fetched successfully",
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
// PUT /profile — update user profile
router.put("/profile", isUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      businessName,
      businessType,
      businessDetails,
      subscription,
      integrations,
    } = req.body;

    const updateFields = {
      ...(businessName && { businessName }),
      ...(businessType && { businessType }),
      ...(businessDetails && { businessDetails }),
      ...(subscription && { subscription }),
      ...(integrations && { integrations }),
      updatedAt: new Date(),
    };

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
      new: true,
      runValidators: true,
    }).select("-otp");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
// PUT /upload-profile-image — upload & update profile image
router.put(
  "/upload-profile-image",
  isUser,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const uploadedImageUrl = await uploadToCloudinary(
        file.buffer,
        "user_profiles",
        file.mimetype
      );

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { "businessDetails.logo": uploadedImageUrl },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({
        message: "Profile image updated successfully",
        profileImage: updatedUser.businessDetails.logo,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);
//get the subscription plans 
router.get('/get-plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ createdAt: -1 }); // newest first
    res.status(200).json({ success: true, plans });
  } catch (err) {
    console.error('Error fetching subscription plans:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
// step one 
router.get('/subscription/available-plans', isUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    console.log("this is user:"+user)
    const plans = await SubscriptionPlan.find({ isActive: true });

    const currentPlan = user.subscription.plan;
    const currentPlanDetails = plans.find(p => p.name === currentPlan);

    res.json({
      success: true,
      currentPlan: currentPlanDetails || null,
      availablePlans: plans.map(plan => ({
        id: plan._id,
        name: plan.name,
        price: plan.price,
        durationInDays: plan.durationInDays,
        features: plan.features,
        isCurrent: plan.name === currentPlan
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch plans', error: err.message });
  }
});
router.post('/subscription/initiate', isUser, async (req, res) => {
  const { planId } = req.body;
  const user = await User.findById(req.user.userId);
  const plan = await SubscriptionPlan.findById(planId);

  if (!plan || !plan.isActive) {
    return res.status(404).json({ success: false, message: 'Invalid or inactive plan' });
  }

  if (user.subscription.plan === plan.name && user.subscription.isActive && user.subscription.endDate > new Date()) {
    return res.status(400).json({
      success: false,
      message: 'You already have this active subscription'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Eligible for subscription',
    plan: {
      id: plan._id,
      name: plan.name,
      price: plan.price,
      durationInDays: plan.durationInDays
    },
    user: {
      id: user._id,
      email: user.email
    }
  });
});
router.post('/subscription/create-order', isUser, async (req, res) => {
  const { planId } = req.body;
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found' });
  }

  const amountInPaise = plan.price * 100;

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `receipt_${Date.now()}`
  });

  const transaction = await Transaction.create({
    user: req.user.userId,
    amount: plan.price,
    paymentMethod: 'razorpay',         // ✅ FIXED: Required
    paymentId: order.id,
    status: 'pending',
    type: 'subscription',
    itemReference: planId,
    itemModel: 'SubscriptionPlan'      // ✅ FIXED: Required
  });

  res.status(200).json({
    success: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    transactionId: transaction._id
  });
});

router.post('/subscription/verify-payment', isUser, async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    transactionId,
    planId
  } = req.body;

  const transaction = await Transaction.findOne({
    _id: transactionId,
    user: req.user.userId,
    status: 'pending'
  });

  if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    transaction.status = 'failed';
    transaction.failureReason = 'Signature verification failed';
    await transaction.save();
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.durationInDays);

  await User.findByIdAndUpdate(req.user.id, {
    subscription: {
      plan: plan.name,
      startDate,
      endDate,
      isActive: true
    }
  });

  transaction.status = 'completed';
  transaction.paymentId = razorpay_payment_id;
  transaction.completedAt = new Date();
  await transaction.save();

  res.status(200).json({
    success: true,
    message: 'Subscription activated successfully',
    subscription: {
      plan: plan.name,
      startDate,
      endDate
    }
  });
});
router.get('/subscription/my-subscription', isUser, async (req, res) => {
  const user = await User.findById(req.user.userId);
  const { plan, startDate, endDate, isActive } = user.subscription || {};

  if (!isActive || !endDate || new Date() > new Date(endDate)) {
    return res.json({
      success: true,
      hasActiveSubscription: false,
      message: 'No active subscription'
    });
  }

  res.json({
    success: true,
    hasActiveSubscription: true,
    subscription: {
      plan,
      startDate,
      endDate,
      daysRemaining: Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
    }
  });
});


module.exports = router;