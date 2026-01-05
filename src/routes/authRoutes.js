const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");

const router = express.Router();

// /api/auth/signup
router.post("/signup", registerUser);

// /api/auth/login
router.post("/login", loginUser);

module.exports = router;
