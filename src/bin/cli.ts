#!/usr/local/bin/node
import readline from "readline";

import amqp, { Channel, Connection } from "amqplib";

import { config } from "../lib";

console.log("Connecting...");

let connection: Connection;
let channel: Channel;

async function messageHandler(message: amqp.Message | null) {
  if (message === null) {
    return;
  }
  const content = message.content.toString("utf-8");
  console.log(content);
}

async function run() {
  connection = await amqp.connect(`amqp://${config.rabbitmqHost}:${config.rabbitmqPort}`);

  const inboundQueue = config.inboundQueue;
  const outboundQueue = config.outboundQueue;

  channel = await connection.createChannel();
  await channel.assertQueue(inboundQueue);
  await channel.assertQueue(outboundQueue);

  await channel.consume(outboundQueue, messageHandler);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("Enter your commands...");
  rl.on("line", async (line) => {
    await channel.sendToQueue(inboundQueue, Buffer.from(line));
  });

  rl.on("SIGINT", async () => {
    await connection.close();
    process.exit(0);
  });
}

run().catch((error) => {
  console.error(error.message);
});
