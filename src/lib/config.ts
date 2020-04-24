/**
 * Для aline
 *
 * По заданию очереди нужно назвать incomeQueue и outcomeQueue.
 * На мой взгялд, с лексической точки зрения вернее будет "inboundQueue" и "outboundQueue".
 *
 * Вот определения из Оксфордского словаря:
 * income - money received, especially on a regular basis, for work or through investments. Доход, прибыль
 * outcome - the way a thing turns out; a consequence. Исход, результат, последствие
 *
 * Будь мы в одной команде, я бы это обсудил, а не просто так сам по себе решил,
 * но пока ничего особо не обсудить
 */
import { readFileSync } from "fs";

export interface BaseConfig {
  // kvs reads messages from this queue
  inboundQueue: string;
  // kvs sends message responses to this queue
  outboundQueue: string;
  // Whether to save snapshots of the current state periodically
  snapshotOn: boolean;
  // How often to save snapshots.
  snapshotInterval: number;
  // Whether to keep a log of operations
  appendLogOn: boolean;
  // Where to keep snapshots and logs
  dataPath: string;
}

export interface Config extends BaseConfig {
  rabbitmqHost: string;
  rabbitmqPort: string;
}

export const defaultConfig: Config = {
  inboundQueue: "inboundQueue",
  outboundQueue: "outboundQueue",
  rabbitmqHost: "localhost",
  rabbitmqPort: "5672",
  snapshotOn: true,
  snapshotInterval: 10 * 1000,
  appendLogOn: true,
  dataPath: "/usr/local/etc/kvs/data/",
};

const configPath = process.env.CONFIG_PATH || "/usr/local/etc/kvs/kvs-config.json";

let userConfig: Partial<Config> = {};

try {
  userConfig = JSON.parse(readFileSync(configPath, "utf-8"));
} catch (e) {
  if (!e.message.includes("ENOENT")) {
    throw new Error(e);
  }
}

export const config: Config = {
  ...defaultConfig,
  ...userConfig,
};
