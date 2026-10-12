import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { keccak256, toBytes } from "viem";
import {
  clientRoutes,
  clientMethodSchemas,
  spokeProtocolAbi,
  demoTokenAbi,
  type ClientMethod,
} from "@spoke/protocol";
import deployment from "../../../../packages/contracts/deployments/10143.json" with { type: "json" };
import { proofView } from "../services/proof.js";
import { events } from "../db/schema.js";
import { present } from "../db/store.js";
import { route, routeRegistry, router, equivalentPath } from "../http/router.js";
import { ok } from "../http/respond.js";
import type { Services } from "../types.js";

export const systemRoutes = (services: Services, deploymentBlock: string) => {
  const app = router();
  const { store, chain } = services;
  route(app, services, "GET", "/system/endpoints", "public", (c) =>
    ok(
      c,
      Object.entries(clientRoutes).map(([name, candidate]) => {
        const method = name as ClientMethod;
        const registered = routeRegistry.find(
          (item) =>
            item.method === candidate.verb && equivalentPath(item.path, `/v1${candidate.path}`),
        );
        return {
          method: candidate.verb,
          path: `/v1${candidate.path}`,
          auth: registered?.auth ?? candidate.auth,
          inputSchema: `clientMethodSchemas["${name}"].input`,
          outputSchema: `clientMethodSchemas["${name}"].output`,
          rateLimit: { requests: candidate.auth === "public" ? 240 : 300, windowSeconds: 60 },
          apiVersion: "v1",
          availability:
            registered && clientMethodSchemas[method].release === "core" ? "live" : "designed",
        };
      }),
    ),
  );
  route(app, services, "GET", "/system/contracts", "public", (c) =>
    ok(c, {
      contracts: [
        { name: "SpokeProtocol", address: chain.address, abi: spokeProtocolAbi },
        { name: "SpokeDemoUSD", address: chain.token, abi: demoTokenAbi },
      ].flatMap((item) => {
        if (!item.address) return [];
        const checked =
          chain.chainId === deployment.chainId
            ? deployment.contracts.find(
                (entry) =>
                  entry.address.toLowerCase() === item.address?.toLowerCase() &&
                  entry.name === item.name,
              )
            : undefined;
        return [
          {
            name: item.name,
            address: item.address,
            deployedBlock: checked?.blockNumber ?? deploymentBlock,
            deploymentTx: checked?.txHash ?? null,
            abiHash: keccak256(toBytes(JSON.stringify(item.abi))),
            sourceVerified:
              checked?.verification.creationMatch === "exact_match" &&
              checked.verification.runtimeMatch === "exact_match",
            version: "3.0",
          },
        ];
      }),
    }),
  );
  route(app, services, "GET", "/networks", "public", async (c) =>
    ok(c, [
      {
        chainId: chain.chainId,
        name: chain.chainId === 10143 ? "Monad Testnet" : "Local Anvil",
        explorer: chain.chainId === 10143 ? "https://testnet.monadvision.com" : null,
        protocolAddress: chain.address,
        allowedTokens: await chain.tokenInfo(),
        status: chain.address ? "live" : "not_deployed",
      },
    ]),
  );
  route(app, services, "GET", "/tokens", "public", async (c) => ok(c, await chain.tokenInfo()));
  route(app, services, "GET", "/system/status", "public", async (c) => {
    const [cursor, head, incidents, reconciliation] = await Promise.all([
      store.get("indexer", "cursor"),
      chain.head(),
      store.list("incident", undefined, undefined, 100),
      store.get("reconciliation", "latest"),
    ]);
    const indexedBlock =
      typeof cursor?.payload.blockNumber === "string" ? cursor.payload.blockNumber : null;
    const lag = indexedBlock ? BigInt(head.blockNumber) - BigInt(indexedBlock) : null;
    const indexedTime =
      typeof cursor?.payload.indexedBlockAt === "string"
        ? Date.parse(cursor.payload.indexedBlockAt)
        : null;
    const lagSeconds =
      indexedTime === null ? null : Math.max(0, (Date.parse(head.at) - indexedTime) / 1000);
    return ok(c, {
      indexer: {
        name: typeof cursor?.payload.source === "string" ? cursor.payload.source : null,
        indexedBlock,
        chainHead: head.blockNumber,
        chainTime: head.at,
        lagBlocks: lag === null ? null : (lag > 0n ? lag : 0n).toString(),
        lagSeconds,
        state: !chain.address
          ? "not_configured"
          : !cursor
            ? "syncing"
            : cursor.payload.status === "syncing"
              ? "syncing"
              : cursor.payload.status === "behind" || (lagSeconds !== null && lagSeconds > 15)
                ? "behind"
                : "live",
      },
      reconciliation: reconciliation?.payload ?? null,
      incidents: incidents.items.map(present),
      maintenanceWindow: null,
    });
  });
  route(app, services, "GET", "/system/events", "public", async (c) => {
    const query = z
      .object({
        name: z.string().max(100).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      })
      .parse(c.req.query());
    const rows = await store.db
      .select()
      .from(events)
      .where(
        and(
          eq(events.chainId, chain.chainId),
          query.name ? eq(events.name, query.name) : undefined,
        ),
      )
      .orderBy(desc(events.at), desc(events.logIndex))
      .limit(query.limit);
    return ok(c, await Promise.all(rows.map((row) => proofView(store, chain.chainId, row))));
  });
  return app;
};
