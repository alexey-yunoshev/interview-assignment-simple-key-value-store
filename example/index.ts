import amqp, { Connection } from "amqplib";

let connection: Connection;

function messageHandler(message: amqp.Message | null) {
  console.log("got smth", message?.content.toString());
}

async function run() {
  connection = await amqp.connect("amqp://localhost:5672");

  const queue = "hello";

  const channel = await connection.createChannel();
  await channel.assertQueue(queue);
  console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);
  channel.consume(queue, messageHandler, { noAck: true });

  const message = "Hello World";
  await channel.sendToQueue(queue, Buffer.from(message));
  console.log(" [x] Sent %s", message);
}

run()
  .then(() => {
    // connection.close();
  })
  .catch((error) => {
    console.error(error.message);
  });
