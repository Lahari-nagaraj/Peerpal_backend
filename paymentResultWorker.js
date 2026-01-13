const amqp = require("amqplib");

const startResultWorker = async () => {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertQueue("payment_result_queue", { durable: true });

  console.log("📥 Payment Result Worker running...");

  channel.consume("payment_result_queue", (msg) => {
    if (!msg) return;

    const result = JSON.parse(msg.content.toString());
    console.log("📊 Payment Result:", result);

    if (result.status === "SUCCESS") {
      console.log("🎉 Finalize EMI payment");
      // later → update DB, notify user
    } else {
      console.log("🚨 Payment failed, will retry / notify");
    }

    channel.ack(msg);
  });
};

startResultWorker();
