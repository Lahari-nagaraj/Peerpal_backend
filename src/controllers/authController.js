const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");//autherization and session management 

const generateToken = (user) => { //jwt token
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};
// POST /api/auth/signup
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  // basic validation
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email and password are required" });
  }
  try {
    // check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",//$1 sql injection protection
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "Email is already in use" });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // insert user
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, credit_score, is_email_verified, created_at`,
      [name, email, passwordHash]
    );

    const user = result.rows[0];

    // generate JWT token
    const token = generateToken(user);

    return res.status(201).json({
      message: "User registered successfully",
      user,
      token,
    });
  } catch (err) {
    console.error("Error in registerUser:", err);
    return res
      .status(500)
      .json({ message: "Something went wrong during registration" });
  }
};

// POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // basic validation
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required" });
  }

  try {
    // find user by email
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];

    // compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // generate token
    const token = generateToken(user);

    // remove password_hash before sending user
    delete user.password_hash;

    return res.json({
      message: "Login successful",
      user,
      token,
    });
  } catch (err) {
    console.error("Error in loginUser:", err);
    return res
      .status(500)
      .json({ message: "Something went wrong during login" });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
