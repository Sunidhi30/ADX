const express = require("express");
const router = express.Router();

const { loginUser,
    signupUser,
    verifyOtp,
    loginWithOtp} = require("../controllers/authController")


//sign up for users
router.post("/signup", signupUser);
//verify-otp for sign up
router.post("/verify-otp", verifyOtp);
//login
router.post("/login", loginUser);
//login with otp
router.post("/login-otp", loginWithOtp); // sends OTP
module.exports = router;
