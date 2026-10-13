# Spoke

**Distribution is a network. Now everyone in it can earn.**

[![CI](https://github.com/Enoch208/spoke/actions/workflows/ci.yml/badge.svg)](https://github.com/Enoch208/spoke/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Spoke is the distribution graph: an open distribution protocol on Monad. A merchant launches a campaign with public commission rules and pre-funds its rewards. Anyone can join and share it, and anyone who receives a link can buy or pass it on with a link of their own, so a product branches through people. When a real onchain purchase happens, the contract reserves the reward from the funded pool and splits it across the eligible people on that sale's path by the campaign's disclosed weights. After a settlement hold each person claims their share; before it, the merchant can refund the sale and nobody earns a commission. Settled sales then build a distributor record that travels across merchants, and the same campaigns, graphs and receipts are open to any app.

Pay for revenue, not reach.

**Live:** [Explore campaigns](https://usespoke.xyz/explore), [developer tools](https://usespoke.xyz/developers) and the [API endpoint registry](https://api.usespoke.xyz/v1/system/endpoints). [Demo mode](https://usespoke.xyz/demo) provides a separate, labelled walkthrough.

## The rules

| Rule                                       | What it means                                                                                                                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A real sale is the only trigger            | No reward for clicks, sign-ups or recruiting.                                                                                                                                                  |
| Rewards are pre-funded                     | A referred purchase the pool cannot cover is refused before payment. A direct purchase reserves no commission.                                                                                 |
| The split is a public policy               | The merchant sets the rate, the cap and the weight of each level, nearest first (for example 50 / 25 / 15 / 10). The remainder of any rounding goes to the nearest person, so no unit is lost. |
| The graph can be deep, payouts are bounded | Links form a branching graph; each sale pays a finite, disclosed number of levels. Prototype capacity limits apply.                                                                            |
| Terms never change after a sale            | Every accepted sale keeps the policy it was made under.                                                                                                                                        |
| Refund or finalize, never both             | A pending sale is refunded by the merchant before its unlock time, or finalized by anyone after it.                                                                                            |
| Only settled sales count                   | Pending and refunded sales never reach a public profile.                                                                                                                                       |

## Status

The core web app and API are deployed, with settlement on Monad Testnet:

- Merchant setup, versioned products, campaign publication and management, referral links and graphs, checkout, buyer delivery, receipts, refunds and claims in the web app.
- An immutable settlement contract with separate reward and buyer-payment ledgers, 1–5 commission levels, refunds, finalization, pull claims and future policy versions with 24 hours' notice.
- A 6-decimal testnet demo token (`SpokeDemoUSD`, not a stablecoin and not redeemable), generated contract ABIs, shared reward math and schemas for all 189 client methods.
- A PostgreSQL API implementing 135 core client methods for wallet sessions, immutable product versions, campaign publication, graph exploration, receipts, six earnings buckets, merchant vaults, reports and privacy-aware distributor records. Four optional methods support separate mainnet wallet funding; another 50 designed methods return an explicit unavailable error.
- Envio HyperIndex settlement and SDUSD event indexing, canonical replay and reorganization checks. HyperSync supplies history; native RPC supplies live events with TLS verification and bounded log ranges.
- Cached Nansen context for four demonstration distributors, labelled as supported mainnet history. These new wallets have no observed history; page views do not purchase provider queries, and insights never determine payouts.
- Passkey accounts and signing sessions with Mera, plus private campaign notes protected by a separate PRF namespace. Notes are encrypted locally and never sent to the API or blockchain.
- Private product uploads and buyer-only delivery that checks sale state directly onchain, plus a bounded testnet gas station with durable transaction retries.
- A typed public read SDK, request and response validation, contract invariants and an actual frontend-client-to-API-to-contract settlement journey.
- A scripted two-merchant testnet settlement proof with four rewarded levels, a branch, a separate refund, successful claims and protected unused-budget withdrawals.

The contracts are source verified through Monad Sourcify, with exact matches for creation and runtime bytecode. Live pages use the deployed API and indexed contract state; Demo uses local fixtures. Prototype contract limits are 128 campaigns, 256 nodes and 100 sales per campaign. External commerce integrations, teams, webhooks and multi-currency settlement remain designed previews, with no live financial behavior.

Optional mainnet wallet funding is configured in the hosted app. It accepts supported EVM source assets and quotes native USDC on Monad Mainnet to an authenticated external wallet. Deployments without an app key display an unavailable state. This separate route never credits testnet checkout, campaign budgets or earnings. Provider integration tests use deterministic responses; no real mainnet transfer has been verified for this release.

## Research distribution partners

Sign in as a merchant and open [Distributors](https://usespoke.xyz/distributors). Search a shared name, handle or public wallet, narrow by category and settled activity, then select two or three people and choose **Compare selected**. The comparison shows settled, direct and network sales, merchant diversity, campaigns and the latest settlement. Open the supporting receipts or each full profile to inspect their contribution before deciding who to work with. Selections survive filters and page reloads.

Only shared fields appear; hidden values are never treated as zero. Pending and refunded sales do not count as settled performance. A sale can credit several people, so candidate columns must not be added together. Monetary totals appear only when complete receipt evidence establishes one token denomination.

**Review wallet context** opens separate, cached research for a public wallet. Its networks, source and age are disclosed. It never affects directory ranking or rewards, and a page view does not buy a provider refresh. Private and pseudonymous profiles cannot be used to retrieve external wallet context. Demo mode labels all sample records.

## Private campaign notes

Sign in with a passkey, open a campaign and choose **Open private notes**. Write an outreach plan, then **Encrypt & save** and confirm the same passkey. Saving locks the notebook; reopening it requires that passkey again. Each campaign has separate notes.

Mera evaluates `SHA-256("spoke.campaign-notes.v1")` as a dedicated WebAuthn PRF salt. HKDF-SHA-256 derives a non-extractable AES-256-GCM key, bound to the account, chain, campaign and credential. Every save generates a new nonce. This namespace does non-account work; it does not change the existing wallet derivation or signing session.

Only ciphertext and the metadata needed to reopen it persist in this browser. Unlocked text stays in page memory until locked, navigation, sign-out or the five-minute limit. This is local storage, not cloud sync: keep both the browser data and the same passkey. Clearing browser data loses the notes, and a wallet recovery phrase cannot restore this separate namespace.

## Layout

```
apps/web              Next.js app: landing, campaigns, network explorer, checkout, dashboards
apps/api              Hono API: catalog, wallet sessions, read model, public read endpoints
packages/contracts    Foundry: protocol interface, demo token, settlement contract, tests
packages/protocol     Shared TypeScript: ABIs, chains, payout math, money, statuses, API schemas
packages/sdk          Validated public read client
indexer               Envio HyperIndex handlers and deployment container
ops                   Private database and asset backup operations
```

## Run it

Requires Node 24, pnpm 10, Foundry and PostgreSQL 16. For a disposable local database:

```sh
docker run --name spoke-postgres -d \
  -e POSTGRES_USER=spoke -e POSTGRES_PASSWORD=spoke -e POSTGRES_DB=spoke \
  -p 127.0.0.1:54332:5432 postgres:16.10-bookworm
```

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm contracts:test
pnpm test
pnpm dev
```

The web app runs on http://localhost:3040 and the API on http://localhost:8740. `pnpm abi` rebuilds the contracts and regenerates the TypeScript ABIs.

For local settlement, start Anvil and follow the [contract deployment commands](packages/contracts/README.md), then set the returned addresses in both app environment files. The API applies its database migrations on startup. See the [API guide](apps/api/README.md), [indexer setup](indexer/README.md), [read client](packages/sdk/README.md) and [operations](ops/README.md).

## Network

Monad Testnet, chain ID 10143, explorer [MonadVision](https://testnet.monadvision.com). Commerce settlement uses testnet demo tokens with no monetary value. Optional wallet funding runs separately on Monad Mainnet and involves real funds; it does not fund these testnet contracts.

| Contract      | Address                                                                                           | Deployment transaction                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| SpokeProtocol | [0x1Fa5…3eca](https://testnet.monadvision.com/address/0x1Fa5e94e44DB2101664C0a24dBf1e52912af3eca) | [0xabc0…abaf](https://testnet.monadvision.com/tx/0xabc0a2e3328332bd9b5a869fe8388718ded540a7623fea8fdb0ce9888da8abaf) |
| SpokeDemoUSD  | [0xb627…8E23](https://testnet.monadvision.com/address/0xb6279237003eD710bB4ccE6fbd126e07eD4D8E23) | [0xa7c7…c231](https://testnet.monadvision.com/tx/0xa7c7c5190fd2907510394a0baf44302d463c400f4f9b3ded703ee923918bc231) |

Deployment blocks, compiler settings, checked token metadata and source-verification evidence are in [the deployment manifest](packages/contracts/deployments/10143.json).

The [settlement proof](packages/contracts/deployments/10143-proof.json) records real testnet transactions, allocations, refund and finalization times, claimed balances and ledger reconciliation. These are scripted demonstration wallets using non-redeemable SDUSD, not customer revenue. [Reproduction commands](packages/contracts/README.md) cover Anvil and the checked testnet deployment.

The [hosted API journey](packages/contracts/deployments/10143-production-journey.json) records 15 confirmed onchain transactions in a journey using the actual frontend client and HTTPS API: campaign publication and funding, two referral nodes, purchases, buyer delivery, refund access revocation, finalization and all claims. [Campaign 3](https://usespoke.xyz/c/3) remains active; [sale 4](https://usespoke.xyz/receipts/10143/4) finalized and [sale 5](https://usespoke.xyz/receipts/10143/5) refunded. Global reconciliation matched every campaign, and the contract's 4.9 SDUSD balance exactly covered its remaining liabilities. A fresh backup restored 90 indexed events, four insight caches and the unchanged credit reservation into a disposable database; the asset archive was readable. Backups are host-local.

Release verification passed 551 application tests, 33 contract tests, typechecks, lint, formatting, ABI parity, production builds and [hosted CI](https://github.com/Enoch208/spoke/actions/runs/38313139691). Live browser checks covered public journeys at 390px and desktop widths, alongside an interactive Demo purchase and claim journey. Scripted EOA wallets signed the financial transactions; the frontend client and API prepared and verified the journey. Hardware passkey signing was not exercised by the browser check. Five final worker samples over a minute each reported five seconds of lag, with TLS verification enabled and no temporary mounts. This demonstrates the tested journey, rather than high-load capacity.

## Credits

The landing page shows third-party marks for two reasons only: the "Built on" strip and the inner ring of the developer section credit the open-source tools and network Spoke is built with, and the outer ring shows everyday apps a Spoke link can be shared in, since a link is a plain URL. None of them implies a partnership or an integration. Each mark belongs to its owner. The Solidity logo is by the Solidity team and licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Most marks come from [Simple Icons](https://simpleicons.org); the Monad, Foundry and viem marks come from their official sites and repositories.
