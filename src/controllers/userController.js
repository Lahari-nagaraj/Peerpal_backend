const pool = require("../config/db");

// GET /api/user/me
const getMyProfile = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, credit_score, created_at FROM users WHERE id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("getMyProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getMyProfile };
