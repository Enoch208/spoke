# Spoke indexer

HyperIndex 3.14 indexes the deployed Spoke settlement contract and SDUSD transfer events on Monad Testnet, starting at the token deployment. HyperSync supplies historical events; the configured private Monad RPC becomes the primary source at the chain head through Envio's supported `for: realtime` setting. HyperSync remains a secondary source. HyperIndex persists event identity, block hashes and checkpoints in a separate PostgreSQL schema and rolls back reorganizations.

The API reads these entities, verifies event blocks against its Monad RPC, then commits receipt, allocation, claim, campaign, balance, reputation and notification projections with one cursor transaction. A database advisory lock serializes workers. A changed deployment or canonical block hash discards the affected projections and replays from deployment. Offchain accounts and notifications survive replay. The API reports the actual indexed timestamp and lag; it reports `behind` beyond 15 seconds.

The indexed token is non-redeemable SDUSD. The transactions in `packages/contracts/deployments/10143-proof.json` are a scripted settlement demonstration, not customer revenue.

## Run

Run PostgreSQL first. Set the variables in `.env.example` in an untracked `.env`. The database must already exist and the indexer role must own the `envio` schema. Keep that schema separate from the API's `public` tables.

```sh
cd indexer
pnpm install --ignore-workspace --frozen-lockfile
MONAD_RPC_URL=http://127.0.0.1:1 pnpm codegen
pnpm typecheck
pnpm start
```

Set the API's `INDEXER_SOURCE=envio` and use the same database. `direct_rpc` is the explicitly reported fallback source. The API never calls RPC to silently fill gaps in HyperIndex event history.

Set `MONAD_RPC_URL` to the existing private Monad Testnet endpoint in the worker's runtime environment. Keep it server-side: the credential is part of the URL. Code generation only parses configuration, so the Docker build and CI use an unused loopback URL; the generated code does not embed that URL. HyperIndex reads the actual endpoint from the environment at startup. Changing only these source settings permits a normal resume with the existing checkpoint; do not use `-r` for this change.

The current HyperSync token's measured quota is 15,000 units per 60 seconds, with a cost of 1,000 units for a query. A HyperSync-only live worker exhausted that quota and silently waited for its reset, producing minute-long freshness gaps. Disabling query caching did not fix those gaps. Avoid running redundant validation workers with the production token.

The private RPC's current plan permits a maximum five-block `eth_getLogs` range. A measured 100-block request returned HTTP 413 with JSON-RPC code `-32615`, so both `initial_block_interval` and `interval_ceiling` are five. The provider must also have sufficient request capacity: Envio's native RPC client has no rate cap exposed by this configuration, and increasing `polling_interval` does not eliminate the per-block reads required for reorg checks. Monitor actual RPC errors and indexed freshness under load; this setup does not establish high-load capacity. The existing two-block lag and rollback settings remain in force.

The Docker image installs Debian Bookworm's pinned `ca-certificates` package and points `SSL_CERT_FILE` to its trust bundle. Envio's native RPC client needs this system bundle for TLS verification; Node's bundled certificates alone do not suffice. A missing bundle caused native log requests to fail with `unable to get local issuer certificate` and switch back to HyperSync, even while Node's RPC probe succeeded. Keep certificate verification enabled. A read-only host CA bundle mounted at the same path supports a temporary trial on an older image; the rebuilt image supplies its own bundle.

Hasura is disabled; neither PostgreSQL nor an indexer query API needs a public port. HyperIndex's health and metrics server uses port 9898. When running it in a container, publish that port only on `127.0.0.1`, and place only the Spoke database and indexer on their dedicated network. Keep `ENVIO_API_TOKEN` and database credentials server-side.

HyperIndex 3.14 initializes Hasura configuration even when `ENVIO_HASURA=false`. Production therefore requires the three `HASURA_GRAPHQL_*` values in `.env.example`. They point to an unused loopback port and use an unused placeholder; no Hasura server is enabled or contacted. Set `ENVIO_PG_SSL_MODE` explicitly as well. The supplied `false` is for the dedicated internal database network; use `verify-full` with a correctly configured certificate when connecting over an untrusted network.

```sh
curl --fail http://127.0.0.1:9898/healthz
```

Changing the configured contract or starting block requires a replay. HyperIndex refuses incompatible state instead of continuing with a partial history. Use `pnpm exec envio start -r` only for the dedicated indexer schema when deliberately rebuilding it. Never point the indexer at the API's public schema.
