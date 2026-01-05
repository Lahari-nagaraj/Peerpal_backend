const express = require('express');
const dotenv= require("dotenv");
const pool = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");

dotenv.config();

const app = express();
app.use(express.json());//automatically parses the incoming json requests(req body would be undefined without this)

app.get("/",(req,res)=>{
    res.json({message:"Peerpal Backend API running"});

});

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");// returns current DB server time
    return res.json({//if db connection is successful and queries r working returns 200
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

app.use("/api/auth", authRoutes);//mounts auth routes
app.use("/api/user", userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});