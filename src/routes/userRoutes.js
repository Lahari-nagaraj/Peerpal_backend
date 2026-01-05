const express = require("express");
const authenticateUser = require("../middlewares/authMiddleware");
const { getMyProfile } = require("../controllers/userController");

const router = express.Router();

// Protected route
router.get("/me", authenticateUser, getMyProfile);

module.exports = router;

