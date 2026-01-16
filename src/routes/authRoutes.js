const express = require("express");
const router = express.Router();

const { registerUser, loginUser } = require("../controllers/authController");
const { loginLimiter } = require("../middlewares/rateLimiter");

// Signup
router.post("/signup", registerUser);

// Login (rate-limited)
router.post("/login", loginLimiter, loginUser);

module.exports = router;
