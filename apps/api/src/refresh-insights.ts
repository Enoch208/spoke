import { readFile } from "node:fs/promises";
import { addressString } from "@spoke/protocol";
import { z } from "zod";
import { connectStore } from "./db/store.js";
import { createInsightsService } from "./services/insights.js";

const env = z
  .object({
    DATABASE_URL: z.url(),
    NANSEN_API_KEY: z.string().min(1),
    NANSEN_CREDIT_BUDGET: z.coerce.number().int().min(0).max(100).default(50),
  })
  .parse(process.env);
const proof = z
  .object({
    actors: z.object({ A: addressString, B: addressString, C: addressString, D: addressString }),
  })
  .parse(
    JSON.parse(
      await readFile(
        new URL("../../../packages/contracts/deployments/10143-proof.json", import.meta.url),
        "utf8",
      ),
    ),
  );
const store = connectStore(env.DATABASE_URL);
try {
  await store.migrate();
  const insights = createInsightsService(store, {
    apiKey: env.NANSEN_API_KEY,
    demoAddresses: Object.values(proof.actors),
    budgetCredits: env.NANSEN_CREDIT_BUDGET,
  });
  process.stdout.write(`${JSON.stringify(await insights.refreshConfigured())}\n`);
} finally {
  await store.close();
}
