const express = require('express');
const dotenv= require("dotenv");
const pool = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");

dotenv.config();

const app = express();
app.use(express.json());

app.get("/",(req,res)=>{
    res.json({message:"Peerpal Backend API running"});

});

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    return res.json({
      status: "ok",
      dbTime: result.rows[0].now,
    });
  } catch (err) {
    console.error("Health check error:", err);
    return res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

app.use("/api/auth", authRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});