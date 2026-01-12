const amqp = require("amqplib");

const startWorker = async () => {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertQueue("emi_queue", {
    durable: true,
  });

  console.log("👷 Worker is listening for EMI events...");

  channel.consume("emi_queue", (msg) => {
    if (msg) {
      const data = JSON.parse(msg.content.toString());

      console.log("📩 EMI EVENT RECEIVED:", data);

      if (data.type === "EMI_PAID") {
        console.log(
          `✅ EMI PAID | User ${data.userId} | Amount ₹${data.amount}`
        );
      }

      channel.ack(msg);
    }
  });
};

startWorker();
