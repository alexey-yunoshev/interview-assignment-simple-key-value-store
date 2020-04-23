import amqp, { Channel, Connection, Message } from "amqplib";
import { BaseConfig, Config } from "./config";
import { createWriteStream, WriteStream } from "fs";
import path from "path";

export interface KvsParams extends BaseConfig {
  channel: Channel;
  connection: Connection;
}

export class Kvs {
  channel: Channel;
  connection: Connection;
  inboundQueue: string;
  outboundQueue: string;
  queryHandler: (query: string) => void;
  state = new Map<string, string>();
  appendLogOn: boolean;
  // We are going to initialize and use it only if appendLogOn is true
  // @ts-ignore
  logFile: WriteStream;
  // Same but with snapshotOn
  // @ts-ignore
  snapshotInterval: NodeJS.Timeout;

  constructor({
    channel,
    connection,
    inboundQueue,
    outboundQueue,
    appendLogOn,
    snapshotInterval,
    snapshotOn,
    dataPath,
  }: KvsParams) {
    this.channel = channel;
    this.connection = connection;
    this.inboundQueue = inboundQueue;
    this.outboundQueue = outboundQueue;
    this.appendLogOn = appendLogOn;

    this.consume();

    if (appendLogOn) {
      this.queryHandler = this.queryHandlerWithLogging;
      this.logFile = createWriteStream(path.join(dataPath, "log"), { encoding: "utf-8" });
    } else {
      this.queryHandler = this.queryHandlerWithoutLogging;
    }

    if (snapshotOn) {
      this.snapshotInterval = setInterval(this.makeSnapshot, snapshotInterval);
    }
  }

  send(content: string) {
    return this.channel.sendToQueue(this.outboundQueue, Buffer.from(content));
  }

  messageHandler(message: Message | null) {
    if (message === null) {
      return;
    }

    this.queryHandler(message.content.toString("utf-8"));
  }

  queryHandlerWithoutLogging(query: string) {
    query
    //TODO
  }

  queryHandlerWithLogging(query: string) {
    this.logQuery(query);
    this.queryHandlerWithoutLogging(query);
  }

  logQuery(query: string) {
    query
    //TODO
  }

  async makeSnapshot() {
    await this.channel.close();
    // create write stream to new snapshot
    // write state
    this.consume();
  }

  consume() {
    return this.channel.consume(this.inboundQueue, this.messageHandler);
  }

  close() {
    if (this.appendLogOn) {
      this.logFile.close();
    }
    return this.connection.close();
  }
}

export async function kvsFactory({ inboundQueue, outboundQueue, rabbitmqHost, rabbitmqPort, ...rest }: Config) {
  const connection = await amqp.connect(`amqp://${rabbitmqHost}:${rabbitmqPort}`);
  const channel = await connection.createChannel();
  await channel.assertQueue(inboundQueue);
  await channel.assertQueue(outboundQueue);

  return new Kvs({
    channel,
    connection,
    outboundQueue,
    inboundQueue,
    ...rest,
  });
}
