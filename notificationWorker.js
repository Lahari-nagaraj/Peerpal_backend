const amqp = require("amqplib");
const pool = require("./src/config/db");
const { getIO } = require("./src/socket");

const startNotificationWorker = async () => {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertQueue("notification_queue", { durable: true });

  console.log("🔔 Notification Worker running...");

  channel.consume("notification_queue", async (msg) => {
    if (!msg) return;

    const { userId, message } = JSON.parse(msg.content.toString());

    try {
      await pool.query(
        `INSERT INTO notifications (user_id, message)
         VALUES ($1, $2)`,
        [userId, message]
      );

      console.log("📢 Notification saved:", message);

      // 🔥 Emit real-time event
      const io = getIO();
      io.to(`user_${userId}`).emit("notification", {
        message,
        createdAt: new Date(),
      });

      channel.ack(msg);
    } catch (err) {
      console.error("❌ Notification error:", err.message);
    }
  });
};

startNotificationWorker();
