const amqp = require("amqplib");

const MAX_RETRIES = 3;

const startWorker = async () => {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertQueue("emi_queue", { durable: true });
  await channel.assertQueue("emi_retry_queue", { durable: true });
  await channel.assertQueue("emi_failed_queue", { durable: true });

  // 🔹 NEW QUEUE (payment request)
  await channel.assertQueue("payment_request_queue", { durable: true });

  console.log("👷 Worker running with retry & DLQ");

  channel.consume("emi_queue", async (msg) => {
    if (!msg) return;

    const data = JSON.parse(msg.content.toString());
    const retries = data.retries || 0;

    try {
      console.log("📩 Processing EMI:", data);

      // 🔥 SIMULATE RANDOM FAILURE (30%)
      if (Math.random() < 0.3) {
        throw new Error("Simulated payment failure");
      }

      // ✅ REPLACED SUCCESS LOGIC STARTS HERE
      console.log("📤 Sending payment request");

      channel.sendToQueue(
        "payment_request_queue",
        Buffer.from(
          JSON.stringify({
            type: "PROCESS_PAYMENT",
            userId: data.userId,
            loanId: data.loanId,
            repaymentId: data.repaymentId,
            amount: data.amount,
          })
        ),
        { persistent: true }
      );

      channel.ack(msg);
      // ✅ REPLACED SUCCESS LOGIC ENDS HERE
    } catch (err) {
      console.error("❌ EMI FAILED:", err.message);

      if (retries >= MAX_RETRIES) {
        console.log("☠️ Moving message to DLQ");

        channel.sendToQueue(
          "emi_failed_queue",
          Buffer.from(JSON.stringify(data)),
          { persistent: true }
        );

        channel.ack(msg);
      } else {
        console.log(`🔁 Retrying EMI (attempt ${retries + 1})`);

        channel.sendToQueue(
          "emi_retry_queue",
          Buffer.from(
            JSON.stringify({ ...data, retries: retries + 1 })
          ),
          { persistent: true }
        );

        channel.ack(msg);
      }
    }
  });
};

startWorker();
