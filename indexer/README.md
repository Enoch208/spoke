# Spoke indexer

HyperIndex 3.14 indexes the deployed Spoke settlement contract and SDUSD transfer events on Monad Testnet, starting at the token deployment. HyperSync supplies historical and live events. HyperIndex persists event identity, block hashes and checkpoints in a separate PostgreSQL schema and rolls back reorganizations.

The API reads these entities, verifies event blocks against its Monad RPC, then commits receipt, allocation, claim, campaign, balance, reputation and notification projections with one cursor transaction. A database advisory lock serializes workers. A changed deployment or canonical block hash discards the affected projections and replays from deployment. Offchain accounts and notifications survive replay. The API reports the actual indexed timestamp and lag; it reports `behind` beyond 15 seconds.

The indexed token is non-redeemable SDUSD. The transactions in `packages/contracts/deployments/10143-proof.json` are a scripted settlement demonstration, not customer revenue.

## Run

Run PostgreSQL first. Set the variables in `.env.example` in an untracked `.env`. The database must already exist and the indexer role must own the `envio` schema. Keep that schema separate from the API's `public` tables.

```sh
cd indexer
pnpm install --ignore-workspace --frozen-lockfile
pnpm codegen
pnpm typecheck
pnpm start
```

Set the API's `INDEXER_SOURCE=envio` and use the same database. `direct_rpc` is the explicitly reported fallback source. The API never calls RPC to silently fill gaps in HyperIndex event history.

Hasura is disabled; neither PostgreSQL nor an indexer query API needs a public port. HyperIndex's health and metrics server uses port 9898. When running it in a container, publish that port only on `127.0.0.1`, and place only the Spoke database and indexer on their dedicated network. Keep `ENVIO_API_TOKEN` and database credentials server-side.

HyperIndex 3.14 initializes Hasura configuration even when `ENVIO_HASURA=false`. Production therefore requires the three `HASURA_GRAPHQL_*` values in `.env.example`. They point to an unused loopback port and use an unused placeholder; no Hasura server is enabled or contacted. Set `ENVIO_PG_SSL_MODE` explicitly as well. The supplied `false` is for the dedicated internal database network; use `verify-full` with a correctly configured certificate when connecting over an untrusted network.

```sh
curl --fail http://127.0.0.1:9898/healthz
```

Changing the configured contract or starting block requires a replay. HyperIndex refuses incompatible state instead of continuing with a partial history. Use `pnpm exec envio start -r` only for the dedicated indexer schema when deliberately rebuilding it. Never point the indexer at the API's public schema.
