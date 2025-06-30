const express = require("express");
const router = express.Router();
const isUser = require("../middlewares/auth");
const upload = require("../middlewares/uploadBuffer");

const User = require("../models/User");
const { uploadToCloudinary } = require("../utils/cloudinary");

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
//connecting with the facebook page 
module.exports = router;