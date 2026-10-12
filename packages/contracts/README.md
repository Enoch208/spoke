# Spoke settlement

The immutable native checkout contract holds two separate balances: merchant-funded commission rewards and buyer payments. Purchases snapshot their policy version and recipients. Refunds return the buyer payment and release the reserved commission. Finalization after the hold makes distributor rewards and merchant proceeds claimable; each beneficiary withdraws their own balance.

Policies support 1–5 recipients, weights summing to 10,000 basis points, per-sale and campaign liability caps, and either renormalized short paths or returned unused shares. Future terms require 24 hours' notice and one upcoming version at a time. Previously accepted sales retain their terms. Direct purchases use node ID `0` and reserve no rewards.

Pausing stops new nodes and purchases. Refunds, finalization and claims continue. Unused rewards can be withdrawn only when paused, ended or expired; pending and claimable obligations remain in the vault.

This deployment uses SDUSD, a freely mintable, non-redeemable testnet token with six decimals. Prototype limits are 128 campaigns, 256 nodes and 100 sales per campaign. The campaign limit bounds a token-wide reward claim. Increasing these limits requires another gas review.

Run `pnpm contracts:test` for unit, fuzz, security and stateful invariant checks. Run `forge test --gas-report` inside this package for gas measurements. The deployment script accepts only Anvil (31337) and Monad Testnet (10143). Provide `DEPLOYER_PRIVATE_KEY` privately and run `forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC_URL"` for a simulation; add `--broadcast` to deploy. Generated ABIs come from the compiled implementations through `pnpm abi`.

## Run the settlement fixture

The fixture proves settlement mechanics using scripted demonstration wallets; it does not represent customers or commercial revenue.

Start a local chain from the repository root:

```sh
pnpm chain
```

Export an Anvil-funded `DEPLOYER_PRIVATE_KEY` in a separate terminal, then run:

```sh
pnpm deploy:local
```

The deployment output contains the token and protocol addresses. Only chain IDs 31337 and 10143 are accepted. Deployment signing and demonstration-wallet signing use separate keys.

## Prepare demonstration wallets

Create ten fresh keys in a private file outside the repository. The command refuses to overwrite an existing file and never prints the keys:

```sh
mkdir -p "$HOME/.spoke"
pnpm --filter @spoke/contracts fixture:keys "$HOME/.spoke/fixture.env"
set -a
. "$HOME/.spoke/fixture.env"
set +a
```

Export `GAS_STATION_PRIVATE_KEY` for a funded testnet gas wallet. This key pays only demonstration-wallet gas. `fundGas()` tops each wallet up to 0.25 MON, at most 2.5 MON plus gas per call for all ten wallets. Check gas balances before each stage and repeat the top-up when needed; the purchase can consume most of a buyer's initial gas allocation. On Anvil, use one of its funded accounts for this gas wallet.

From `packages/contracts`, with `RPC_URL`, `TOKEN_ADDRESS` and `PROTOCOL_ADDRESS` set to the chosen network:

```sh
forge script script/Fixture.s.sol:Fixture \
  --sig 'fundGas()' --rpc-url "$RPC_URL" --broadcast --slow

forge script script/Fixture.s.sol:Fixture \
  --sig 'seed(address,address)' "$TOKEN_ADDRESS" "$PROTOCOL_ADDRESS" \
  --rpc-url "$RPC_URL" --broadcast --slow
```

Run `seed` once with fresh demonstration wallets. It creates two merchants' campaigns, an A → B → C → D path, a second child of B, and a D root for the second campaign. Two purchases remain pending; a third is refunded. The first purchase reserves 1,000,000 base units, split nearest first as 500,000 / 250,000 / 150,000 / 100,000. The second reserves 500,000 units for D.

The script returns `campaignA`, `campaignB`, `saleA`, `saleB` and `refundedSale`. Foundry also writes the result to `broadcast/Fixture.s.sol/<chainId>/seed-latest.json`. Keep the full broadcast directory private: it is recovery material. After a partial broadcast, recover that transaction sequence with Foundry's `--resume`; do not start a new seed run. Resume skips simulation and requires supplying the participant signers again through Foundry wallet options, such as encrypted keystores; the original script's environment variables alone do not register them. Funding gas changes the gas station's nonce, so it can replenish the participant wallets before resuming their recorded transactions.

## Settle and claim

Read both pending sales' `unlockAt` through `getSale`. On Monad Testnet, wait until the latest block timestamp reaches both values. On Anvil, advance to the later timestamp and mine a block:

```sh
cast rpc --rpc-url "$RPC_URL" evm_setNextBlockTimestamp "$UNLOCK_AT"
cast rpc --rpc-url "$RPC_URL" evm_mine
```

Then run with the returned sale IDs:

```sh
forge script script/Fixture.s.sol:Fixture \
  --sig 'settle(address,address,uint256,uint256,uint256)' \
  "$TOKEN_ADDRESS" "$PROTOCOL_ADDRESS" "$SALE_A" "$SALE_B" "$REFUNDED_SALE" \
  --rpc-url "$RPC_URL" --broadcast --slow
```

Settlement finalizes both purchases, pauses each campaign, withdraws only unused rewards while distributor liabilities remain, then claims rewards and merchant proceeds. D receives rewards from both merchants. The script checks exact allocations, buyer refund, claimed balances and both conservation equations. It never advances testnet time. Each new proof run requires fresh wallets and campaign IDs.

Checked deployment and verification evidence lives in [deployments/10143.json](deployments/10143.json).

The [recorded Monad Testnet proof](deployments/10143-proof.json) contains campaigns 1 and 2, finalized sales 1 and 2, and refunded sale 3. Its 58 confirmed transactions include gas top-ups. The proof records canonical block hashes, exact allocations, final balances, refund and finalization timestamps, and historical reward ledgers immediately after each unused-budget withdrawal. Both reward and buyer-payment conservation equations reconcile to the contract's actual token balance.
