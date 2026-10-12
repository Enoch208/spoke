# Spoke

**Pay for revenue, not reach.**

[![CI](https://github.com/Enoch208/spoke/actions/workflows/ci.yml/badge.svg)](https://github.com/Enoch208/spoke/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Spoke is a merchant-funded distribution network on Monad. A merchant lists a digital product and pre-funds a reward pool. Anyone can share the product with a referral link, and anyone who receives that link can buy it or share it onward with a link of their own. When a buyer completes a real onchain purchase, the contract reserves the reward from the funded pool and splits it between the nearest three people in the link chain. After a short settlement hold the merchant and each distributor claim exactly what they are owed. Before the hold ends, the merchant can refund the sale, and then nobody is paid a commission.

Every payout can be recomputed from the public sale receipt and the campaign's terms.

## The rules

| Rule                                   | What it means                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| A real sale is the only trigger        | No reward for clicks, sign-ups or recruiting.                                                                               |
| Rewards are pre-funded                 | A purchase that the pool cannot cover reverts before the buyer pays.                                                        |
| At most three people are paid per sale | Nearest first: 100%, or 75 / 25, or 60 / 25 / 15. The nearest person takes any rounding remainder, so no base unit is lost. |
| Link ancestry is immutable             | A link's parent is fixed when it is created and cannot be rewritten after a purchase.                                       |
| Refund or finalize, never both         | A pending sale is refunded by the merchant before its unlock time, or finalized by anyone after it.                         |
| Pull payouts                           | Each party claims their own balance; the contract never pushes funds to a list of wallets.                                  |

## Status

This repository is under active construction for Monad Metropolis. Built and tested so far:

- The frozen protocol interface (`packages/contracts/src/ISpokeProtocol.sol`): every function, event and error of the settlement contract, with its ABI exported to TypeScript.
- `SpokeDemoUSD`, a 6-decimal testnet demo token with a capped faucet. It is not a stablecoin and is not redeemable for anything.
- The reward arithmetic in TypeScript (`packages/protocol`), tested against the split and rounding vectors above.
- An API skeleton that reports API, database, RPC and indexer health separately, and a web shell wired to Monad Testnet through wagmi.

Not built yet: the `SpokeProtocol` contract itself, its deployment, the merchant, distributor and buyer flows, indexing and digital delivery. Deployed addresses and transaction links will be added here only once they exist.

## Layout

```
apps/web              Next.js app: landing, campaigns, referral pages, checkout, dashboards
apps/api              Hono API: catalog, wallet sessions, checkout intents, read model
packages/contracts    Foundry: protocol interface, demo token, settlement contract, tests
packages/protocol     Shared TypeScript: ABIs, chains, reward math, money, statuses, API schemas
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
