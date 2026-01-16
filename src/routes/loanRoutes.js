const express = require("express");
const router = express.Router();

const authenticateUser = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/roleMiddleware");

const {
  requestLoan,
  getAllLoans,
  approveLoan,
  rejectLoan,
  payEmi,
} = require("../controllers/loanController");

const {
  loanRequestLimiter,
  emiPaymentLimiter,
} = require("../middlewares/rateLimiter");

// Student requests loan (rate limited)
router.post(
  "/request",
  authenticateUser,
  loanRequestLimiter,
  requestLoan
);

// Admin views all loans
router.get(
  "/admin/all",
  authenticateUser,
  requireAdmin,
  getAllLoans
);

// Admin approves loan
router.patch(
  "/admin/:loanId/approve",
  authenticateUser,
  requireAdmin,
  approveLoan
);

// Admin rejects loan
router.patch(
  "/admin/:loanId/reject",
  authenticateUser,
  requireAdmin,
  rejectLoan
);

// Student pays EMI (rate limited)
router.post(
  "/repayment/:repaymentId/pay",
  authenticateUser,
  emiPaymentLimiter,
  payEmi
);

module.exports = router;
