const amqp = require("amqplib");

let channel;

const connectRabbitMQ = async () => {
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();

  await channel.assertQueue("emi_queue", {
    durable: true,
  });

  console.log("✅ Connected to RabbitMQ");
};

const publishToQueue = async (data) => {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }

  channel.sendToQueue(
    "emi_queue",
    Buffer.from(JSON.stringify(data)),
    { persistent: true }
  );
};

module.exports = {
  connectRabbitMQ,
  publishToQueue,
};
