const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const isAdmin = require("../middlewares/isAdmin");
const SubscriptionPlan = require("../models/SubscriptionPlan")
require('dotenv').config(); // to load from .env

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send OTP
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    let admin = await Admin.findOne({ email });

    if (!admin) {
      admin = new Admin({
        email,
        name: "New Admin",
        otp: { code: otpCode, expiresAt }
      });
    } else {
      admin.otp = { code: otpCode, expiresAt };
    }

    await admin.save();

    // Send OTP via email
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Your Admin Login OTP',
      text: `Your OTP for admin login is ${otpCode}. It will expire in 10 minutes.`
    });

    res.json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

  try {
    const admin = await Admin.findOne({ email });

    if (!admin || !admin.otp || admin.otp.code !== otp) {
      return res.status(401).json({ success: false, message: 'Invalid OTP' });
    }

    if (admin.otp.expiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'OTP expired' });
    }

    admin.otp = undefined;
    await admin.save();

    const token = jwt.sign(
        {
          id: admin._id,
          email: admin.email,
          role: admin.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
    res.json({
      success: true,
      message: 'OTP verified successfully',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        profileImage: admin.profileImage
      }
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
// Create a new subscription plan (protected by admin token)
router.post('/create-plan', isAdmin , async (req, res) => {
    const { name, price, durationInDays, features } = req.body;
  
    if (!name || !price || !durationInDays) {
      return res.status(400).json({ message: 'Name, price, and duration are required' });
    }
  
    try {
      const existing = await SubscriptionPlan.findOne({ name });
      if (existing) {
        return res.status(409).json({ message: 'Plan with this name already exists' });
      }
  
      const plan = new SubscriptionPlan({
        name,
        price,
        durationInDays,
        features,
        createdBy: req.admin.id
      });
  
      await plan.save();
  
      res.status(201).json({ success: true, message: 'Subscription plan created', plan });
    } catch (err) {
      console.error('Error creating subscription plan:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// Get all subscription plans (accessible to admin)
router.get('/get-plans', async (req, res) => {
    try {
      const plans = await SubscriptionPlan.find().sort({ createdAt: -1 }); // newest first
      res.status(200).json({ success: true, plans });
    } catch (err) {
      console.error('Error fetching subscription plans:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
