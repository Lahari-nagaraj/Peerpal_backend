const amqp = require("amqplib");

let channel;

const connectRabbitMQ = async () => {
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();

  // Main queue
  await channel.assertQueue("emi_queue", {
    durable: true,
    deadLetterExchange: "",
    deadLetterRoutingKey: "emi_retry_queue",
  });

  // Retry queue (delayed)
  await channel.assertQueue("emi_retry_queue", {
    durable: true,
    messageTtl: 5000, // 5 sec delay
    deadLetterExchange: "",
    deadLetterRoutingKey: "emi_queue",
  });

  // Dead letter queue
  await channel.assertQueue("emi_failed_queue", {
    durable: true,
  });

  // Payment service queues
await channel.assertQueue("payment_request_queue", {
  durable: true,
});

await channel.assertQueue("payment_result_queue", {
  durable: true,
});


  console.log("✅ RabbitMQ queues ready");
};

const publishToQueue = async (data) => {
  channel.sendToQueue(
    "emi_queue",
    Buffer.from(JSON.stringify({ ...data, retries: 0 })),
    { persistent: true }
  );
};

module.exports = {
  connectRabbitMQ,
  publishToQueue,
};



