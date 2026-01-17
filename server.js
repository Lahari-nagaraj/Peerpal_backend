const express = require("express");
const dotenv = require("dotenv");
const http = require("http");

const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const tokenRoutes = require("./src/routes/tokenRoutes");
const loanRoutes = require("./src/routes/loanRoutes");
const { connectRabbitMQ } = require("./src/config/rabbitmq");
const { initSocket } = require("./src/socket");

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "PeerPal Backend API running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/token", tokenRoutes);
app.use("/api/loan", loanRoutes);

const server = http.createServer(app);

// 🔥 Initialize socket.io ONLY ONCE here
initSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await connectRabbitMQ();
});
