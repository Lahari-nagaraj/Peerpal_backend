const amqp = require("amqplib");
const pool = require("./src/config/db");

const startResultWorker = async () => {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertQueue("payment_result_queue", { durable: true });
  await channel.assertQueue("notification_queue", { durable: true });

  console.log("📥 Payment Result Worker running with DB transactions...");

  channel.consume("payment_result_queue", async (msg) => {
    if (!msg) return;

    const result = JSON.parse(msg.content.toString());
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      if (result.status === "SUCCESS") {
        // 1️⃣ Mark repayment PAID
        await client.query(
          `UPDATE repayments 
           SET status = 'PAID' 
           WHERE id = $1`,
          [result.repaymentId]
        );

        // 2️⃣ Insert transaction
        await client.query(
          `INSERT INTO transactions (loan_id, repayment_id, user_id, amount, type)
           VALUES ($1, $2, $3, $4, 'EMI_PAYMENT')`,
          [
            result.loanId,
            result.repaymentId,
            result.userId,
            result.amount,
          ]
        );

        // 3️⃣ Update credit score
        await client.query(
          `UPDATE users 
           SET credit_score = credit_score + 10 
           WHERE id = $1`,
          [result.userId]
        );

        // 4️⃣ Publish notification event
        channel.sendToQueue(
          "notification_queue",
          Buffer.from(
            JSON.stringify({
              userId: result.userId,
              message: `EMI of ₹${result.amount} paid successfully.`,
            })
          ),
          { persistent: true }
        );

        console.log("✅ EMI finalized & notification queued");
      } else {
        // Payment failed notification
        channel.sendToQueue(
          "notification_queue",
          Buffer.from(
            JSON.stringify({
              userId: result.userId,
              message: "EMI payment failed. Please try again.",
            })
          ),
          { persistent: true }
        );

        console.log("❌ Payment failed, notification queued");
      }

      await client.query("COMMIT");
      channel.ack(msg);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("💥 Transaction failed, rolled back:", err.message);
    } finally {
      client.release();
    }
  });
};

startResultWorker();
