# Spoke read client

This workspace package provides a typed, credential-free client for Spoke's public campaign, graph, receipt, reputation and system endpoints. Inputs and response envelopes are validated with the shared Zod schemas. It is not published to npm yet.

```ts
import { createSpokeClient } from "@spoke/sdk";

const spoke = createSpokeClient({ baseUrl: "https://api.usespoke.xyz" });
const receipt = await spoke.read("receipts.get", { saleId: "1", chainId: 10143 });
```

Use `publicReadMethods` to enumerate supported methods. `SpokeApiError` preserves the server's error code, status, request ID and retryability. Every request has a ten-second timeout and omits browser credentials. Integer monetary amounts remain base-unit strings.

Shared transport and schemas are exported from `@spoke/protocol`. Use `readEnvelope` instead of `read` to retain the indexed block, freshness and request ID alongside the data. Canonical settlement can be checked through receipt verification and the contract.
