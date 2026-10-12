# Spoke settlement

The immutable native checkout contract holds two separate balances: merchant-funded commission rewards and buyer payments. Purchases snapshot their policy version and recipients. Refunds return the buyer payment and release the reserved commission. Finalization after the hold makes distributor rewards and merchant proceeds claimable; each beneficiary withdraws their own balance.

Policies support 1–5 recipients, weights summing to 10,000 basis points, per-sale and campaign liability caps, and either renormalized short paths or returned unused shares. Future terms require 24 hours' notice and one upcoming version at a time. Previously accepted sales retain their terms. Direct purchases use node ID `0` and reserve no rewards.

Pausing stops new nodes and purchases. Refunds, finalization and claims continue. Unused rewards can be withdrawn only when paused, ended or expired; pending and claimable obligations remain in the vault.

This deployment uses SDUSD, a freely mintable, non-redeemable testnet token with six decimals. Prototype limits are 128 campaigns, 256 nodes and 100 sales per campaign. The campaign limit bounds a token-wide reward claim. Increasing these limits requires another gas review.

Run `pnpm contracts:test` for unit, fuzz, security and stateful invariant checks. Run `forge test --gas-report` inside this package for gas measurements. The deployment script accepts only Anvil (31337) and Monad Testnet (10143). Provide `DEPLOYER_PRIVATE_KEY` privately and run `forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC_URL"` for a simulation; add `--broadcast` to deploy. Generated ABIs come from the compiled implementations through `pnpm abi`.
