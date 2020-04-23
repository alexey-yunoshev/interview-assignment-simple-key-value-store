import { Kvs, kvsFactory } from "../lib/kvs";
import { config } from "../lib/config";

let kvs: Kvs;

async function run() {
  kvs = await kvsFactory(config);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function close() {
  await kvs.close();
}

process.on("SIGINT", close);
process.on("SIGTERM", close);
