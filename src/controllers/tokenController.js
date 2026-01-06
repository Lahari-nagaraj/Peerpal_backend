const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token required" });
  }

  try {
    // verify refresh token signature
    jwt.verify(refreshToken, process.env.JWT_SECRET);

    // check if token exists in DB
    const result = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()",
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const userId = result.rows[0].user_id;

    // fetch user
    const userResult = await pool.query(
      "SELECT id, role FROM users WHERE id = $1",
      [userId]
    );

    const user = userResult.rows[0];

    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};


const logoutUser = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token required" });
  }

  await pool.query(
    "DELETE FROM refresh_tokens WHERE token = $1",
    [refreshToken]
  );

  return res.json({ message: "Logged out successfully" });
};


module.exports = { refreshAccessToken,logoutUser };
