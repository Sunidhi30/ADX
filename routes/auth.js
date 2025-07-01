const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
// const { sendOtpEmail } = require("../utils/sendEmail");
const sendOtpEmail = require("../utils/sendEmail");

const otpStore = new Map();

// Signup route
router.post("/signup", async (req, res) => {
  const { email, businessName, businessType, businessDetails } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email, {
      otp,
      expiresAt,
      businessName,
      businessType,
      businessDetails,
    });

    await sendOtpEmail(email, otp);

    res.status(200).json({
      message: "OTP sent to email. Please verify to complete signup.",
      email,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// OTP verification route
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const stored = otpStore.get(email);
    if (!stored)
      return res.status(400).json({ message: "No OTP request found for this email" });

    if (stored.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (stored.expiresAt < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    const newUser = new User({
      email,
      businessName: stored.businessName,
      businessType: stored.businessType,
      businessDetails: stored.businessDetails,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newUser.save();
    otpStore.delete(email);

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      process.env.JWT_SECRET || "Apple",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        businessName: newUser.businessName,
        businessType: newUser.businessType,
        subscription: newUser.subscription,
        integrations: newUser.integrations,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// Login - Send OTP
router.post("/login", async (req, res) => {
    const { email } = req.body;
  
    try {
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });
  
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
      user.otp = { code: otp, expiresAt };
      await user.save();
  
      await sendOtpEmail(email, otp);
  
      res.status(200).json({ message: "OTP sent to email" });
  
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
});
  // Verify OTP and Login
router.post("/login-otp", async (req, res) => {
    const { email, otp } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });
  
      if (!user.otp || !user.otp.code || !user.otp.expiresAt)
        return res.status(400).json({ message: "No OTP request found" });
  
      if (user.otp.code !== otp)
        return res.status(400).json({ message: "Invalid OTP" });
  
      if (new Date(user.otp.expiresAt) < new Date())
        return res.status(400).json({ message: "OTP expired" });
  
      // OTP is valid — clear and log in
      user.otp = undefined;
      await user.save();
  
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || "Apple",
        { expiresIn: "7d" }
      );
  
      return res.status(200).json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          email: user.email,
          businessName: user.businessName,
          businessType: user.businessType,
          subscription: user.subscription,
          integrations: user.integrations,
        }
      });
  
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
