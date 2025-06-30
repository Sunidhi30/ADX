const cloudinary = require("../utils/cloudinary");
const fs = require("fs");
const User = require("../models/User");
const { uploadToCloudinary } = require("../utils/cloudinary");

// controllers/userController.js
exports.updateUserProfile = async (req, res) => {
    try {
      const userId = req.user.userId;
      const { businessName, businessType, businessDetails, subscription, integrations } = req.body;
  
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
  };
  
exports.getUserProfile = async (req, res) => {
    try {
      const userId = req.user.userId; // Comes from isUser middleware
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
  };
exports.uploadProfileImage = async (req, res) => {
    try {
      const userId = req.user.userId; // Extracted from JWT auth middleware
      const file = req.file;
  
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
  
      const uploadedImageUrl = await uploadToCloudinary(file.buffer, 'user_profiles', file.mimetype);
  
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { "businessDetails.logo": uploadedImageUrl },
        { new: true, runValidators: true }
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json({
        message: 'Profile image updated successfully',
        profileImage: updatedUser.businessDetails.logo,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
