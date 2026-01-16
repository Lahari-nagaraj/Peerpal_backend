const rateLimit = require("express-rate-limit");

// 🔐 Login protection (brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many login attempts. Try again later.",
});

// 💰 Loan request protection
const loanRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: "Too many loan requests. Please wait.",
});

// 💳 EMI payment protection
const emiPaymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: "Too many EMI payment attempts.",
});

module.exports = {
  loginLimiter,
  loanRequestLimiter,
  emiPaymentLimiter,
};
