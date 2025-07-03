const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const isAdmin = require("../middlewares/isAdmin");
const SubscriptionPlan = require("../models/SubscriptionPlan")
const upload = require("../utils/multer");
const cloudinary = require("../utils/cloudinary");
const { uploadToCloudinary } = require("../utils/cloudinary");
const User = require("../models/User")
const mongoose = require('mongoose');
require('dotenv').config(); // to load from .env
// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
// Temporary store for OTPs (could use Redis or similar for production)
const otpStore = new Map();

router.post("/signup", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    // Check if user already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already exists. Please sign in." });
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // Expires in 10 mins

    // Store OTP temporarily
    otpStore.set(email, { code: otpCode, expiresAt });

    // Send OTP email
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Your Admin Signup OTP",
      text: `Your OTP for admin signup is ${otpCode}. It will expire in 10 minutes.`,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent to email. Please verify to complete signup.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.post("/verify-signup-otp", async (req, res) => {
  const { email, otp, firstName, lastName } = req.body;

  // if (!email || !otp || !firstName || !lastName) {
  //   return res.status(400).json({ message: "All fields are required" });
  // }

  try {
    // Get OTP from temporary store
    const storedOtp = otpStore.get(email);

    if (!storedOtp) {
      return res.status(400).json({ message: "No OTP request found for this email" });
    }

    if (storedOtp.code !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (storedOtp.expiresAt < Date.now()) {
      otpStore.delete(email); // Remove expired OTP
      return res.status(400).json({ message: "OTP expired" });
    }

    // OTP is valid - Create user
    const newAdmin = new Admin({
      email,
      name: `${firstName} ${lastName}`,
    });
    await newAdmin.save();

    // Clear OTP from store
    otpStore.delete(email);

    // Generate JWT
    const token = jwt.sign(
      { id: newAdmin._id, email: newAdmin.email, role: newAdmin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Signup successful",
      token,
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        profileImage: newAdmin.profileImage,
      },
    });
  } catch (err) {
    console.error("Signup OTP verification error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(404).json({ message: "Email not found. Please sign up first." });

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    admin.otp = { code: otpCode, expiresAt };
    await admin.save();

    // Send OTP
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Your Admin Login OTP",
      text: `Your OTP for admin login is ${otpCode}. It will expire in 10 minutes.`
    });

    res.status(200).json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.post("/verify-login-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP are required" });

  try {
    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(404).json({ message: "User not found" });

    if (!admin.otp || admin.otp.code !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (admin.otp.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    // Clear OTP and generate JWT token
    admin.otp = undefined;
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
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
    console.error("Login OTP verification error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

//create-plan
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
router.get('/profile', isAdmin, async (req, res) => {
  try {
    const admin = req.admin;

    // Only return safe fields
    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        profileImage: admin.profileImage,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});
router.put("/profile", isAdmin, upload.single("profileImage"), async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { name, email } = req.body;

    const updateFields = {
      ...(name && { name }),
      ...(email && { email }),
      updatedAt: new Date(),
    };

    // Upload image to Cloudinary if file is provided
    if (req.file) {
      const imageUrl = await uploadToCloudinary(
        req.file.buffer,
        "admin_profiles",
        req.file.mimetype
      );
      updateFields.profileImage = imageUrl;
    }

    // Update admin profile
    const updatedAdmin = await Admin.findByIdAndUpdate(adminId, updateFields, {
      new: true,
      runValidators: true,
    }).select("-otp");

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res.status(200).json({
      message: "Admin profile updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Admin update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
router.get('/users', isAdmin, async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});
router.get('/users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});
// Permanently delete a user
router.delete('/users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await User.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});
// GET /api/admin/users/subscriptions
router.get("/test-users/subscriptions", isAdmin, async (req, res) => {
  try {
    const usersWithSubscriptions = await User.find({}, {
      email: 1,
      businessName: 1,
      subscription: 1,
    }).sort({ "subscription.startDate": -1 });

    res.status(200).json({
      success: true,
      data: usersWithSubscriptions
    });
  } catch (error) {
    console.error("Error fetching user subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving user subscriptions"
    });
  }
});

module.exports = router;
