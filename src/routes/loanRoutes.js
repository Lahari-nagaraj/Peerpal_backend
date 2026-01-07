const express = require("express");
const authenticateUser = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/roleMiddleware");
const {
  requestLoan,
  getAllLoans,
  approveLoan,
  rejectLoan,
  payEmi,
} = require("../controllers/loanController");


const router = express.Router();

// Student requests loan
router.post("/request", authenticateUser, requestLoan);

// Admin views all loans
router.get("/admin/all", authenticateUser, requireAdmin, getAllLoans);

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

// Student pays EMI
router.post(
  "/repayment/:repaymentId/pay",
  authenticateUser,
  payEmi
);



module.exports = router;
