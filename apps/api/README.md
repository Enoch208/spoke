# Spoke API

The API publishes campaign, graph, receipt and distributor views derived from the settlement contract. PostgreSQL stores accounts, catalog versions, sessions, transaction intents and the derived event projection. The contract remains the authority for purchases, refunds, finalization and claims.

## Run

Use Node 24, pnpm 10 and PostgreSQL 16. Create a database, copy `.env.example` to an untracked `.env`, then set `DATABASE_URL`, `RPC_URL`, `CHAIN_ID`, `PROTOCOL_ADDRESS` and `TOKEN_ADDRESS`. The server applies its idempotent migrations at startup.

```sh
pnpm install --frozen-lockfile
pnpm --filter @spoke/api start
```

`WEB_ORIGIN` is the exact browser origin allowed to send credentialed requests. `API_ORIGIN` is the API's public HTTPS origin. `STORAGE_DIRECTORY` must be private, writable and persistent. Product downloads are never served from a public directory.

Set `INDEXER_SOURCE=envio` with the [HyperIndex service](../../indexer/README.md) running against the same database. `direct_rpc` is an explicitly identified fallback. Chain timestamps and projection lag are exposed in `/v1/system/status`; stale projections are labelled `behind`.

Use a private RPC endpoint for production. `RPC_REQUESTS_PER_SECOND` defaults to 5; indexing, wallet RPC and health checks share a bounded request queue and deadline. Rate-limited reads retry within that deadline with a shared cooldown. Signed broadcasts and uncertain network failures are not automatically retried.

## Contract

The shared `@spoke/protocol` package exports `clientMethodSchemas`, `clientRoutes`, `ClientInput<M>` and `ClientOutput<M>`. These define all 185 client methods: 135 core methods and 50 designed methods. Designed methods reject live calls with `FEATURE_NOT_AVAILABLE`. `/v1/system/endpoints` lists the HTTP transport, authentication and availability.

Successful responses contain `requestId`, `timestamp`, `schemaVersion`, `chainId`, `contractAddress`, `blockNumber`, `indexingStatus` and `data`. Every canonical successful method response is validated against its shared output schema. Errors contain a typed `error.code`, `message`, `retryable` and `requestId`. Amounts are integer base-unit strings.

Wallet sign-in uses a short-lived, single-use SIWE challenge bound to the configured domain and chain. Sessions use hashed, expiring HTTP-only cookies. Writes require the exact browser origin and the CSRF token returned by sign-in. Destructive actions require a separate, single-use signed confirmation. Public read requests support credential-free CORS.

Checkout intents retain the client-generated `orderKey`. A resumed checkout queries the contract for the original sale before preparing a purchase. Direct purchases use `nodeId: "0"`. Purchase access checks the buyer and current sale state directly onchain; each download rechecks refunds even when its temporary URL has not expired.

Uploads accept one file with bounded size. Images are decoded, stripped of metadata and re-encoded to WebP. Download assets are owner-scoped and integrity checked. Support, session, RPC, uploads, invitations and funding have additional limits beyond the global request limit.

## Optional services

`GAS_STATION_PRIVATE_KEY` enables a Monad Testnet-only native MON drip for low-balance passkey accounts. Signed transfers are durably recorded before broadcast; ambiguous retries resend the same transaction. Account, device, network and daily station budgets limit use. This wallet never pays commissions.

Nansen is server-side, cached and limited to configured demonstration addresses. `NANSEN_CREDIT_BUDGET` is a durable conservative lifetime ceiling; `NANSEN_REFRESH_ON_START=false` prevents page views or restarts from purchasing new queries. Refresh explicitly with `pnpm --filter @spoke/api exec tsx --env-file-if-exists=.env src/refresh-insights.ts`. Insights describe the address's supported mainnet history, never testnet revenue or payout eligibility. No history is limited context, not a safety verdict.

## Verify

```sh
TEST_DATABASE_URL=postgres://localhost:54332/spoke_test pnpm test --project api
```

Use a disposable database. The suite tests sessions, ownership, privacy, idempotency, replay, reorganization, concurrent workers, credit budgets and direct-chain delivery. Gas tests additionally need a dedicated Anvil process on chain 10143 and `TEST_GAS_RPC_URL`.
