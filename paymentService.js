const amqp = require("amqplib");

const startPaymentService = async () => {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertQueue("payment_request_queue", { durable: true });
  await channel.assertQueue("payment_result_queue", { durable: true });

  console.log("💳 Payment Service running...");

  channel.consume("payment_request_queue", async (msg) => {
    if (!msg) return;

    const data = JSON.parse(msg.content.toString());
    console.log("💳 Processing payment:", data);

    // ⏱️ Random delay (1–4 sec)
    const delay = Math.floor(Math.random() * 3000) + 1000;
    await new Promise((res) => setTimeout(res, delay));

    // ❌ Random failure (30%)
    const success = Math.random() > 0.3;

    const result = {
      ...data,
      status: success ? "SUCCESS" : "FAILED",
      processedAt: new Date().toISOString(),
    };

    channel.sendToQueue(
      "payment_result_queue",
      Buffer.from(JSON.stringify(result)),
      { persistent: true }
    );

    console.log(
      success
        ? "✅ Payment SUCCESS"
        : "❌ Payment FAILED"
    );

    channel.ack(msg);
  });
};

startPaymentService();
