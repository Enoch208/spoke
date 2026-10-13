import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { rpcProbe } from "./chain.js";
import { parseEnv } from "./env.js";
import { connectStore } from "./db/store.js";
import { createChainService } from "./services/chain.js";
import proof from "../../../packages/contracts/deployments/10143-proof.json" with { type: "json" };
import { createInsightsService } from "./services/insights.js";
import { createIndexer } from "./services/indexer.js";
import { createRpcFetch } from "./http/rpc-fetch.js";
import { createIndexerHealthProbes } from "./services/indexer-health.js";
import { createAuroraProvider } from "./services/aurora-provider.js";
import { createAuroraService } from "./services/aurora.js";
import { createAuroraConfirmation } from "./services/aurora-confirmation.js";

const env = parseEnv(process.env);
const rpc = createRpcFetch({ requestsPerSecond: env.RPC_REQUESTS_PER_SECOND });
const fundingRpc = createRpcFetch({ requestsPerSecond: 2 });
const store = connectStore(env.DATABASE_URL);
await store.migrate();
const prune = () =>
  store.pruneExpired().catch(() => {
    process.stderr.write("expired_record_cleanup_failed\n");
  });
void prune();
const maintenance = setInterval(() => {
  void prune();
}, 3_600_000);
maintenance.unref();
const chain = createChainService(
  env.RPC_URL,
  env.CHAIN_ID,
  env.PROTOCOL_ADDRESS,
  env.TOKEN_ADDRESS,
  rpc.fetch,
);
const indexer = createIndexer(store, chain, BigInt(env.DEPLOYMENT_BLOCK), {
  source: env.INDEXER_SOURCE,
});
void indexer.tick();
const insights = createInsightsService(store, {
  apiKey: env.NANSEN_API_KEY ?? null,
  budgetCredits: env.NANSEN_CREDIT_BUDGET,
  demoAddresses: [proof.actors.A, proof.actors.B, proof.actors.C, proof.actors.D],
});
if (env.NANSEN_REFRESH_ON_START)
  void insights.refreshConfigured().catch(() => process.stderr.write("insights_refresh_failed\n"));

const app = createApp({
  aurora: createAuroraService(
    store,
    env.AURORA_APP_KEY ? createAuroraProvider(env.AURORA_APP_KEY) : null,
    createAuroraConfirmation(env.AURORA_MONAD_RPC_URL, fundingRpc.fetch),
  ),
  webOrigin: env.WEB_ORIGIN,
  probes: {
    rpc: rpcProbe(env.RPC_URL, env.CHAIN_ID, rpc.fetch),
    database: async () => {
      try {
        return await store.health();
      } catch {
        return "down";
      }
    },
    ...createIndexerHealthProbes(store, env.PROTOCOL_ADDRESS),
    chainHead: async () => (await chain.head()).blockNumber,
  },
  config: { chainId: env.CHAIN_ID, protocolAddress: env.PROTOCOL_ADDRESS },
  services: {
    store,
    chain,
    webOrigin: env.WEB_ORIGIN,
    production: env.NODE_ENV === "production",
    operators: env.OPERATOR_ADDRESSES,
    ...(env.API_ORIGIN ? { apiOrigin: env.API_ORIGIN } : {}),
    ...(env.STORAGE_DIRECTORY ? { storageDirectory: env.STORAGE_DIRECTORY } : {}),
    ...(env.GAS_STATION_PRIVATE_KEY
      ? { gasStationKey: env.GAS_STATION_PRIVATE_KEY as `0x${string}` }
      : {}),
  },
  insights,
  rpcUrl: env.RPC_URL,
  rpcFetch: rpc.fetch,
  deploymentBlock: env.DEPLOYMENT_BLOCK,
});

const server = serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, (info) => {
  process.stdout.write(`Spoke API listening on http://${info.address}:${String(info.port)}\n`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => {
    clearInterval(maintenance);
    indexer.stop();
    rpc.stop();
    fundingRpc.stop();
    server.close(() => {
      void store.close().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  });
