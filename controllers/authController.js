const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

const otpStore = new Map(); // Replace with Redis for production
const sendOtpEmail = async (email, otp) => {
    const message = `Your OTP is ${otp}. It will expire in 10 minutes.`;
    await sendEmail(email, "OTP Verification", message);
  };
  
exports.loginUser = async (req, res) => {
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
};
  
exports.loginWithOtp = async (req, res) => {
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
};
  
exports.signupUser = async (req, res) => {
  const { email, businessName, businessType, businessDetails } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

    // Store details temporarily
    otpStore.set(email, {
      otp,
      expiresAt,
      businessName,
      businessType,
      businessDetails
    });

    await sendOtpEmail(email, otp);

    res.status(200).json({
      message: "OTP sent to email. Please verify to complete signup.",
      email
    });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
     console.log("email:"+email)
     console.log("otp:"+otp)
    try {
      const stored = otpStore.get(email);
      if (!stored)
        return res.status(400).json({ message: "No OTP request found for this email" });
  
      if (stored.otp !== otp)
        return res.status(400).json({ message: "Invalid OTP" });
  
      if (stored.expiresAt < Date.now())
        return res.status(400).json({ message: "OTP expired" });
  
      // Create user now (after OTP verification)
      const newUser = new User({
        email,
        businessName: stored.businessName,
        businessType: stored.businessType,
        businessDetails: stored.businessDetails,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  
      await newUser.save();
      otpStore.delete(email); // clear memory
  
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
        }
      });
  
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ message: "Server error" });
    }
};
