const pool = require("../config/db");

// STUDENT: Request loan
// POST /api/loan/request
const requestLoan = async (req, res) => {
  const { amount, termMonths } = req.body;

  if (!amount || !termMonths) {
    return res.status(400).json({ message: "Amount and term required" });
  }

  try {
    const interestRate = 10.0; // simple fixed interest for now

    const result = await pool.query(
      `INSERT INTO loans (borrower_id, principal_amount, interest_rate, term_months)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.userId, amount, interestRate, termMonths]
    );

    return res.status(201).json({
      message: "Loan request submitted",
      loan: result.rows[0],
    });
  } catch (err) {
    console.error("requestLoan error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ADMIN: View all loan requests
// GET /api/loan/admin/all
const getAllLoans = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.name, u.email
       FROM loans l
       JOIN users u ON l.borrower_id = u.id
       ORDER BY l.created_at DESC`
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("getAllLoans error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ADMIN: Approve loan
// PATCH /api/loan/admin/:loanId/approve
const approveLoan = async (req, res) => {
  const { loanId } = req.params;

  try {
    // fetch loan
    const loanResult = await pool.query(
      "SELECT * FROM loans WHERE id = $1 AND status = 'REQUESTED'",
      [loanId]
    );

    if (loanResult.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found or already processed" });
    }

    const loan = loanResult.rows[0];

    // simple EMI calculation
    const totalInterest =
      (loan.principal_amount * loan.interest_rate * loan.term_months) / (12 * 100);
    const totalPayable = Number(loan.principal_amount) + totalInterest;
    const emiAmount = (totalPayable / loan.term_months).toFixed(2);


    // safety check: prevent duplicate EMIs
const existingRepayments = await pool.query(
  "SELECT id FROM repayments WHERE loan_id = $1",
  [loan.id]
);

if (existingRepayments.rows.length > 0) {
  return res.status(400).json({
    message: "Repayment schedule already exists for this loan",
  });
}

    // generate EMIs
    for (let i = 1; i <= loan.term_months; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);

      await pool.query(
        `INSERT INTO repayments (loan_id, due_date, amount_due)
         VALUES ($1, $2, $3)`,
        [loan.id, dueDate, emiAmount]
      );
    }

    // update loan status
    await pool.query(
      `UPDATE loans
       SET status = 'ACTIVE', approved_at = NOW()
       WHERE id = $1`,
      [loan.id]
    );

    return res.json({
      message: "Loan approved and EMI schedule created",
      emiAmount,
      totalPayable,
    });
  } catch (err) {
    console.error("approveLoan error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ADMIN: Reject loan
// PATCH /api/loan/admin/:loanId/reject
const rejectLoan = async (req, res) => {
  const { loanId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ message: "Rejection reason required" });
  }

  try {
    const result = await pool.query(
      `UPDATE loans
       SET status = 'REJECTED', rejected_at = NOW(), rejection_reason = $1
       WHERE id = $2 AND status = 'REQUESTED'
       RETURNING *`,
      [reason, loanId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found or already processed" });
    }

    return res.json({
      message: "Loan rejected",
      loan: result.rows[0],
    });
  } catch (err) {
    console.error("rejectLoan error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



// STUDENT: Pay EMI
// POST /api/loan/repayment/:repaymentId/pay
const payEmi = async (req, res) => {
  const { repaymentId } = req.params;
  const userId = req.user.userId;

  try {
    // fetch repayment
    const repaymentResult = await pool.query(
      `SELECT r.*, l.borrower_id
       FROM repayments r
       JOIN loans l ON r.loan_id = l.id
       WHERE r.id = $1`,
      [repaymentId]
    );

    if (repaymentResult.rows.length === 0) {
      return res.status(404).json({ message: "Repayment not found" });
    }

    const repayment = repaymentResult.rows[0];

    // ensure student owns this loan
    if (repayment.borrower_id !== userId) {
      return res.status(403).json({ message: "Not your loan" });
    }

    // check status
    if (repayment.status === "PAID") {
      return res.status(400).json({ message: "EMI already paid" });
    }

    const today = new Date();
    const dueDate = new Date(repayment.due_date);

    const isLate = today > dueDate;

    // mark repayment paid
    await pool.query(
      `UPDATE repayments
       SET status = 'PAID'
       WHERE id = $1`,
      [repaymentId]
    );

    // create transaction
    await pool.query(
      `INSERT INTO transactions (loan_id, repayment_id, user_id, amount, type)
       VALUES ($1, $2, $3, $4, 'EMI_PAYMENT')`,
      [repayment.loan_id, repayment.id, userId, repayment.amount_due]
    );

    // update credit score
    const scoreChange = isLate ? -5 : 10;

    await pool.query(
      `UPDATE users
       SET credit_score = credit_score + $1
       WHERE id = $2`,
      [scoreChange, userId]
    );

    // check if all EMIs are paid
    const remaining = await pool.query(
      `SELECT id FROM repayments
       WHERE loan_id = $1 AND status != 'PAID'`,
      [repayment.loan_id]
    );

    if (remaining.rows.length === 0) {
      await pool.query(
        `UPDATE loans
         SET status = 'COMPLETED'
         WHERE id = $1`,
        [repayment.loan_id]
      );
    }

    return res.json({
      message: "EMI paid successfully",
      latePayment: isLate,
      creditScoreChange: scoreChange,
    });
  } catch (err) {
    console.error("payEmi error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


module.exports = {
  requestLoan,
  getAllLoans,
  approveLoan,
  rejectLoan,
  payEmi,
};


