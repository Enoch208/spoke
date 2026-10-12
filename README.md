# Spoke

**Distribution is a network. Now everyone in it can earn.**

[![CI](https://github.com/Enoch208/spoke/actions/workflows/ci.yml/badge.svg)](https://github.com/Enoch208/spoke/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Spoke is the distribution graph: an open distribution protocol on Monad. A merchant launches a campaign with public commission rules and pre-funds its rewards. Anyone can join and share it, and anyone who receives a link can buy or pass it on with a link of their own, so a product branches through people. When a real onchain purchase happens, the contract reserves the reward from the funded pool and splits it across the eligible people on that sale's path by the campaign's disclosed weights. After a settlement hold each person claims their share; before it, the merchant can refund the sale and nobody earns a commission. Settled sales then build a distributor record that travels across merchants, and the same campaigns, graphs and receipts are open to any app.

Pay for revenue, not reach.

## The rules

| Rule                                       | What it means                                                                                                                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A real sale is the only trigger            | No reward for clicks, sign-ups or recruiting.                                                                                                                                                  |
| Rewards are pre-funded                     | A purchase the pool cannot cover is refused before the buyer pays.                                                                                                                             |
| The split is a public policy               | The merchant sets the rate, the cap and the weight of each level, nearest first (for example 50 / 25 / 15 / 10). The remainder of any rounding goes to the nearest person, so no unit is lost. |
| The graph can be deep, payouts are bounded | Links branch without limit; each sale pays a finite, disclosed number of levels.                                                                                                               |
| Terms never change after a sale            | Every accepted sale keeps the policy it was made under.                                                                                                                                        |
| Refund or finalize, never both             | A pending sale is refunded by the merchant before its unlock time, or finalized by anyone after it.                                                                                            |
| Only settled sales count                   | Pending and refunded sales never reach a public profile.                                                                                                                                       |

## Status

This repository is under active construction for Monad Metropolis. Built so far:

- The landing page (`apps/web`), with product screens drawn as clearly labelled illustrations.
- A first protocol interface and its TypeScript ABI, a 6-decimal testnet demo token (`SpokeDemoUSD`, not a stablecoin and not redeemable), shared money and status helpers, and an API skeleton that reports API, database, RPC and indexer health separately.

Not built yet: the settlement contract and its configurable payout policy, deployment, the marketplace, network explorer, checkout, claims, reputation and developer API. Deployed addresses and transaction links will be added here only once they exist.

## Layout

```
apps/web              Next.js app: landing, campaigns, network explorer, checkout, dashboards
apps/api              Hono API: catalog, wallet sessions, read model, public read endpoints
packages/contracts    Foundry: protocol interface, demo token, settlement contract, tests
packages/protocol     Shared TypeScript: ABIs, chains, payout math, money, statuses, API schemas
```

## Run it

Requires Node 24, pnpm 10 and Foundry.

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm contracts:test
pnpm test
pnpm dev
```

The web app runs on http://localhost:3040 and the API on http://localhost:8740. `pnpm abi` rebuilds the contracts and regenerates the TypeScript ABIs.

## Network

Monad Testnet, chain ID 10143, explorer [MonadVision](https://testnet.monadvision.com). Everything here is a testnet demonstration: tokens are demo tokens and balances are not money.

## Credits

The landing page shows third-party marks for two reasons only: the "Built on" strip and the inner ring of the developer section credit the open-source tools and network Spoke is built with, and the outer ring shows everyday apps a Spoke link can be shared in, since a link is a plain URL. None of them implies a partnership or an integration. Each mark belongs to its owner. The Solidity logo is by the Solidity team and licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Most marks come from [Simple Icons](https://simpleicons.org); the Monad, Foundry and viem marks come from their official sites and repositories.
