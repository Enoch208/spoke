import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { rpcProbe } from "./chain.js";
import { parseEnv } from "./env.js";

const env = parseEnv(process.env);

const app = createApp({
  webOrigin: env.WEB_ORIGIN,
  probes: { rpc: rpcProbe(env.RPC_URL, env.CHAIN_ID) },
  config: { chainId: env.CHAIN_ID, protocolAddress: env.PROTOCOL_ADDRESS },
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  process.stdout.write(`Spoke API listening on http://localhost:${String(info.port)}\n`);
});
