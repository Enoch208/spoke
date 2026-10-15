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

The shared `@spoke/protocol` package exports `clientMethodSchemas`, `clientRoutes`, `ClientInput<M>` and `ClientOutput<M>`. These define all 194 client methods: 140 core methods, four optional mainnet funding methods and 50 designed methods. Designed methods reject live calls with `FEATURE_NOT_AVAILABLE`. `/v1/system/endpoints` lists the HTTP transport, authentication and availability.

Successful responses contain `requestId`, `timestamp`, `schemaVersion`, `chainId`, `contractAddress`, `blockNumber`, `indexingStatus` and `data`. Every canonical successful method response is validated against its shared output schema. Errors contain a typed `error.code`, `message`, `retryable` and `requestId`. Amounts are integer base-unit strings.

Wallet sign-in uses a short-lived, single-use SIWE challenge bound to the configured domain and chain. Sessions use hashed, expiring HTTP-only cookies. Writes require the exact browser origin and the CSRF token returned by sign-in. Destructive actions require a separate, single-use signed confirmation. Public read requests support credential-free CORS.

Checkout intents retain the client-generated `orderKey`. A resumed checkout queries the contract for the original sale before preparing a purchase. Direct purchases use `nodeId: "0"`. Purchase access checks the buyer and current sale state directly onchain; each download rechecks refunds even when its temporary URL has not expired.

Uploads accept one file with bounded size. Images are decoded, stripped of metadata and re-encoded to WebP. Download assets are owner-scoped and integrity checked. Support, session, RPC, uploads, invitations and funding have additional limits beyond the global request limit.

## Optional services

`GAS_STATION_PRIVATE_KEY` enables a Monad Testnet-only native MON drip for low-balance passkey accounts. Signed transfers are durably recorded before broadcast; ambiguous retries resend the same transaction. Account, device, network and daily station budgets limit use. This wallet never pays commissions.

Nansen Partner Intelligence is server-side and merchant-triggered. `GET /merchant/distributors/:address/insights` reads cached context; `POST` explicitly researches a public wallet through transactions, first-funder and Monad related-wallet endpoints. Private/pseudonymous registered accounts are refused. A free-plan account preflight and durable lifetime/daily/per-merchant limits precede any provider queries. A refresh reserves three credits; uncertain outcomes are not automatically retried. Cache lifetime is 24 hours. The legacy configured-address refresh remains available to operators but is not a page-view operation. Keep `NANSEN_REFRESH_ON_START=false`.

External research describes supported mainnet history, never testnet revenue, rankings or payout eligibility. Source timestamps, sampled windows and per-endpoint failure states are retained. A first-funder event is not a verified wallet creation date.

## Encrypted workspace

Passkey sessions can list, get and save their own notebooks through `workspace.list`, `workspace.get` and `workspace.save`. The API accepts a strict encrypted envelope, binds it to the session address, configured chain, campaign and registered credential, and rejects extra/plaintext fields. PUT requests require CSRF, a matching expected revision and a fresh revision for changed ciphertext. Exact retries are idempotent. Account-scoped locks serialize conflicting writes; there are at most 100 notebooks and 20 writes per minute. Ciphertext uses the existing generic record store, without a destructive migration.

Only the browser performs PRF/HKDF/AES operations. The backend never receives the encryption key or decrypted note text. Scope and timestamps remain visible to the service; encryption does not conceal all metadata.

## Mainnet wallet funding

This optional route remains separate from testnet settlement. Set `AURORA_APP_KEY` to your application's key and `AURORA_MONAD_RPC_URL` to an HTTPS Monad Mainnet RPC. The RPC defaults to the public Monad endpoint and has its own bounded queue. An absent key returns `configured: false`; Demo refuses real funding instructions.

| Client method                 | HTTP path                             | Access                                                                 |
| ----------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `funding.auroraConfig`        | `GET /v1/funding/aurora`              | Public token catalog, cached for five minutes                          |
| `funding.auroraPreview`       | `POST /v1/funding/aurora/preview`     | External-wallet session and CSRF                                       |
| `funding.auroraCreateDeposit` | `POST /v1/funding/aurora/deposits`    | External-wallet session, CSRF, request UUID and mainnet acknowledgment |
| `funding.auroraDeposit`       | `GET /v1/funding/aurora/deposits/:id` | Owning account only                                                    |

The server fixes the destination to the session signer and canonical Circle USDC on chain 143. Creating instructions also checks `expectedRecipient` against the reviewed quote. Reusing a request UUID with identical details restores the same record; changed details conflict. The API never signs or broadcasts a funding transaction. Users transfer from their own source wallets after reviewing the final amount, token, network, recipient, refund address and deadline at `/wallet/fund`.

Saved instructions survive reloads and provider outages. `statusAvailable: false` preserves the last observed provider state and disables sending instructions in the UI. Expiry disables sending while reconciliation continues. Provider success alone does not mark funds received: the independent RPC must show a successful canonical USDC transfer to the recipient, after request creation and at least two blocks deep. Durable amount reservations prevent duplicate attribution and support batch payouts. Funding locks have a separate pool so provider delays cannot exhaust settlement locks. A verified receipt is a wallet funding record, never a testnet payout or ledger credit.

Passkey signing currently supports testnet, so new mainnet instructions require an external-wallet session. Users need MON on Monad Mainnet to spend received USDC. The feature needs an application key and a user-executed mainnet transfer for live verification; deterministic provider/RPC tests do not establish a completed live transfer.

## Verify

```sh
TEST_DATABASE_URL=postgres://localhost:54332/spoke_test pnpm test --project api
```

Use a disposable database. The suite tests sessions, ownership, privacy, idempotency, replay, reorganization, concurrent workers, credit budgets and direct-chain delivery. Gas tests additionally need a dedicated Anvil process on chain 10143 and `TEST_GAS_RPC_URL`.
