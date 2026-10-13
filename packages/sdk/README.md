# Spoke public read SDK

A typed, credential-free client for 32 public Spoke API methods. Version **0.1.1** targets API `/v1`, schema `3.0`, and the current Monad Testnet deployment. Monetary amounts remain base-unit strings.

## Install

Install the versioned release package from GitHub:

```bash
npm install https://github.com/Enoch208/docs-madonna/releases/download/sdk-v0.1.1/spoke-sdk-0.1.1.tgz
```

The archive includes compiled ESM/CommonJS and TypeScript declarations. It bundles the shared protocol schemas, so consumers do not need the Spoke monorepo or `@spoke/protocol`. Node.js 22 or later is supported. Browser integrations require native `fetch` and `AbortSignal.timeout`; their API deployment must also allow the browser origin through CORS. A server-side integration works without browser CORS restrictions. Browser credentials are always omitted.

## Read a receipt

```ts
import { createSpokeClient, SpokeApiError } from "@spoke/sdk";

const spoke = createSpokeClient({ baseUrl: "https://api.usespoke.xyz" });

try {
  const receipt = await spoke.read("receipts.get", { saleId: "4", chainId: 10143 });
  console.log(receipt);
} catch (error) {
  if (error instanceof SpokeApiError) {
    console.error(error.code, error.status, error.requestId, error.retryable);
  } else {
    throw error;
  }
}
```

Pass the API origin, without `/v1`. CommonJS consumers can use `require("@spoke/sdk")`. Every request validates both its input and the successful response against the bundled shared Zod contract.

## Retain freshness and chain context

```ts
const result = await spoke.readEnvelope("receipts.get", { saleId: "4", chainId: 10143 });
console.log(result.requestId, result.chainId, result.blockNumber, result.indexingStatus);
console.log(result.data);
```

Indexing metadata describes a derived view. Check canonical receipts and contracts when settlement certainty matters. The hosted deployment uses non-redeemable SDUSD on Monad Testnet, not real-money mainnet settlement.

## Methods and types

`publicReadMethods` lists all 32 supported methods. They cover campaigns, products, merchants, links, graphs, checkout previews, receipts, distributor profiles, networks, tokens and system status. `SpokeReadInput<M>` and `SpokeReadOutput<M>` expose per-method types. `SpokeReadEnvelope<M>` describes the envelope; `SpokeReadClient` is the client type.

Paginated reads accept an opaque `cursor` and return `nextCursor`. Pass the returned cursor to the same method with the same filters; stop when it is null. Do not infer page numbers or create cursor strings yourself. The [method reference](https://docs.usespoke.xyz/reference/overview) lists the exact shapes.

## Errors and transport

`SpokeApiError` retains a structured server error's code, HTTP status, request ID and retryability. Input/response validation failures are Zod errors. Network failures, timeouts and invalid JSON can throw native transport/parsing errors; do not assume every rejection is a `SpokeApiError`.

Each request has a ten-second timeout. There are no automatic retries: callers decide bounded backoff for retryable reads. An optional `fetch` implementation supports framework integration and tests; it must respect the supplied signal and `credentials: "omit"`. Never pass private server RPC credentials as the API origin.

The SDK only reads public data. It does not sign transactions, hold keys, maintain authenticated sessions, issue claims or implement checkout writes. Runtime calls outside `publicReadMethods` are refused.

## Versions and releases

Pin exact SDK versions for repeatable integrations. Before 1.0, breaking changes increment the minor version; compatible fixes increment the patch version. The first release validates schema 3.0 responses, but the HTTP deployment is independently versioned and an SDK update may be required when its contract changes. Read [CHANGELOG.md](CHANGELOG.md) before upgrading.

Maintainers build and check an isolated installation before publication:

```bash
pnpm --filter @spoke/sdk build
pnpm --filter @spoke/sdk release:check
pnpm --filter @spoke/sdk exec npm pack --ignore-scripts
```

`release:check` installs the actual packed archive in a temporary project, checks the file allowlist, loads both module formats and typechecks ESM/CommonJS consumers. Publish that verified archive, never the repository root. npm registry publication additionally requires access to the `@spoke` scope and a valid npm login. GitHub release assets provide a direct, versioned installation path independently of registry setup.

The application source repository requires repository access. The SDK archive, documentation and release notes are public through the documentation repository.
