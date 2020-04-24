import path from "path";
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, writeFileSync } from "fs";

import amqp, { Channel, Connection, Message } from "amqplib";

import { BaseConfig, Config } from "./config";
import { parseQuery } from "./parseQuery";
import { Command } from "./Command";
import { modifyingCommands } from "./modifyingCommands";
import { sleep } from "./sleep";

export interface KvsParams extends BaseConfig {
  channel: Channel;
  connection: Connection;
}

export class Kvs {
  channel: Channel;
  connection: Connection;
  inboundQueue: string;
  outboundQueue: string;
  queryHandler: (response: string, command: Command, queryString: string) => void;
  state = new Map<string, string>();
  /**
   * TODO Even though append log persistence works in the sense that it saves
   * the queries to logs files, it doesn't actually use them to restore the state
   * once the server has been restarted. What's done is done only for demo purposes.
   * On the other hand, the snapshot persistence works as expected.
   */
  appendLogOn: boolean;
  // We are going to initialize and use it only if appendLogOn is true
  // @ts-ignore
  logFile: number;
  // Same but with snapshotOn
  // @ts-ignore
  snapshotInterval: NodeJS.Timeout;
  currentNumberOfCommands = 0;
  dataPath: string;
  snapshotOn: boolean;

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
    this.snapshotOn = snapshotOn;
    this.dataPath = dataPath;

    this.consume();

    if (appendLogOn) {
      this.openNewLogFile();
      this.queryHandler = this.queryHandlerWithLogging;
    } else {
      this.queryHandler = this.queryHandlerWithoutLogging;
    }

    this.restoreStateFromSnapshot();

    if (snapshotOn) {
      this.snapshotInterval = setInterval(() => {
        // TODO 0 should be put into config so that it can be configured
        if (this.currentNumberOfCommands > 0) {
          this.saveSnapshot();
        }
      }, snapshotInterval);
    }
  }

  send(content: string) {
    return this.channel.sendToQueue(this.outboundQueue, Buffer.from(content));
  }

  messageHandler(message: Message | null) {
    if (message === null) {
      return;
    }
    this.channel.ack(message);
    this.baseQueryHandler(message.content.toString("utf-8"));
  }

  baseQueryHandler(queryString: string) {
    let response = "";
    try {
      const query = parseQuery(queryString);
      switch (query.command) {
        case Command.Get: {
          const value = this.state.get(query.key);
          if (value === undefined) {
            response = "-OK";
          } else {
            response = `OK ${value}`;
          }
          break;
        }
        case Command.Delete: {
          this.currentNumberOfCommands++;
          const wasPresent = this.state.delete(query.key);
          response = `OK ${Number(wasPresent)}`;
          break;
        }
        case Command.Set: {
          this.currentNumberOfCommands++;
          const previousNumberOfKeys = this.state.size;
          this.state.set(query.key, query.value);
          response = `OK ${this.state.size - previousNumberOfKeys}`;
          break;
        }
      }

      this.queryHandler(response, query.command, queryString);
    } catch (e) {
      this.send(`ERR ${e.message}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async queryHandlerWithoutLogging(response: string, _: Command, _1: string) {
    await this.send(response);
  }

  async queryHandlerWithLogging(response: string, command: Command, queryString: string) {
    await this.queryHandlerWithoutLogging(response, command, queryString);
    if (modifyingCommands.has(command)) {
      this.logQuery(queryString);
    }
  }

  openNewLogFile() {
    if (this.logFile !== undefined) {
      closeSync(this.logFile);
    }
    const logPath = path.join(this.dataPath, "logs", `${new Date().valueOf()}.kvslog`);
    this.logFile = openSync(logPath, "w");
  }

  logQuery(query: string) {
    // TODO 5 is the max number of entries per log file. Should be increased and put into config file
    if (this.currentNumberOfCommands > 5) {
      this.currentNumberOfCommands = 0;
      this.openNewLogFile();
    }
    writeFileSync(this.logFile, `${query}\n`);
  }

  saveSnapshot() {
    const snapshot = this.makeSnapshot();
    const logPath = path.join(this.dataPath, "snapshots", `${new Date().valueOf()}-snapshot.json`);
    writeFileSync(logPath, snapshot, { encoding: "utf-8", flag: "w" });
  }

  makeSnapshot() {
    return JSON.stringify(Array.from(this.state.entries()));
  }

  consume() {
    return this.channel.consume(this.inboundQueue, this.messageHandler.bind(this));
  }

  close() {
    if (this.appendLogOn) {
      closeSync(this.logFile);
    }
    if (this.snapshotOn) {
      clearInterval(this.snapshotInterval);
    }
    return this.connection.close();
  }

  private restoreStateFromSnapshot() {
    const snapshotsPath = path.join(this.dataPath, "snapshots");
    const snapshots = readdirSync(snapshotsPath);
    if (snapshots.length > 0) {
      snapshots.sort();
      const lastSnapshotName = snapshots[snapshots.length - 1];
      const lastSnapshotPath = path.join(snapshotsPath, lastSnapshotName);
      const lastState = JSON.parse(readFileSync(lastSnapshotPath, "utf8"));
      console.debug("======= Last State restored =======");
      console.debug(JSON.stringify(lastState, null, 2));
      console.debug("==================================");
      this.state = new Map(lastState);
    }
  }
}

function connect(url: string) {
  return amqp.connect(url);
}

export async function kvsFactory({
  inboundQueue,
  outboundQueue,
  rabbitmqHost,
  rabbitmqPort,
  dataPath,
  ...rest
}: Config) {
  const logPath = `${dataPath}/logs/`;
  const snapshotPath = `${dataPath}/snapshots/`;

  for (const path of [logPath, snapshotPath]) {
    if (!existsSync(path)) {
      mkdirSync(path, {
        recursive: true,
      });
    }
  }

  const url = `amqp://${rabbitmqHost}:${rabbitmqPort}`;
  let connection: Connection;
  // TODO should be put into config
  let attempts = 100;
  while (true) {
    try {
      attempts--;
      if (attempts === 0) {
        console.error("[Kvs] failed to connect to RabbitMQ. Quitting...");
        process.exit(1);
      }
      connection = await connect(url);
      console.log("[Kvs] successfully connected to RabbitMQ.");
      break;
    } catch (e) {
      if (e.message.includes("ECONNREFUSED") || e.message.includes("ENOTFOUND")) {
        console.log("[Kvs] retrying to connect to RabbitMQ...");
        await sleep(2500);
      } else {
        console.error(e);
        process.exit(1);
      }
    }
  }
  const channel = await connection.createChannel();
  await channel.assertQueue(inboundQueue);
  await channel.assertQueue(outboundQueue);

  return new Kvs({
    channel,
    connection,
    outboundQueue,
    inboundQueue,
    dataPath,
    ...rest,
  });
}
