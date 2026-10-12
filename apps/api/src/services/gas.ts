import { createWalletClient, custom, getAddress, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, fundingStatus, type ClientOutput } from "@spoke/protocol";
import { z } from "zod";
import { records } from "../db/schema.js";
import { digest, newId } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import type { Services } from "../types.js";
import { refreshDrip, rebroadcastDrip, recoverPendingTransfers } from "./gas-transfers.js";

export const dripAmount = 250_000_000_000_000_000n;
const dayMs = 86_400_000;
const station = (services: Services) => {
  if (!services.gasStationKey || services.chain.chainId !== 10143)
    throw new ApiProblem(
      503,
      "FEATURE_NOT_AVAILABLE",
      "The testnet gas station is not configured.",
    );
  const account = privateKeyToAccount(services.gasStationKey);
  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: custom({ request: services.chain.client.request }),
  });
};
export const gasStatus = async (services: Services, owner: string, address: string) => {
  const account = await services.store.require("account", owner);
  const [balances, tokens, previous] = await Promise.all([
    services.chain.balances(getAddress(address)),
    services.chain.tokenInfo(),
    refreshDrip(services, owner),
  ]);
  const nextEligibleAt =
    previous?.state === "received"
      ? new Date(Date.parse(previous.receivedAt ?? previous.createdAt) + dayMs).toISOString()
      : null;
  let state: ClientOutput<"funding.status">["gas"]["state"] = "eligible";
  if (account.payload.accountKind !== "passkey") state = "wallet_account";
  else if (!services.gasStationKey || services.chain.chainId !== 10143) state = "not_configured";
  else if (previous?.state === "sending") state = "sending";
  else if (nextEligibleAt && Date.parse(nextEligibleAt) > Date.now()) state = "already_received";
  else if (BigInt(balances.monWei) >= dripAmount) state = "balance_sufficient";
  else if (previous?.state === "failed") state = "failed";
  else if (
    (await services.chain.client.getBalance({ address: station(services).account.address })) <
    dripAmount + 10_000_000_000_000_000n
  )
    state = "station_empty";
  return fundingStatus.parse({
    ...balances,
    chainId: services.chain.chainId,
    faucetLimit: tokens[0]?.faucetLimit ?? null,
    covers: null,
    gas: {
      state,
      dripAmount: services.gasStationKey ? dripAmount.toString() : null,
      lastDripAt: previous?.receivedAt ?? null,
      lastDripTxHash: previous?.txHash ?? null,
      nextEligibleAt,
    },
  });
};
export const requestGas = async (
  services: Services,
  owner: string,
  address: string,
  device: string,
  ip: string,
) =>
  services.store.exclusive("gas-station", async () => {
    const wallet = station(services);
    if ((await services.chain.client.getChainId()) !== 10143)
      throw new ApiProblem(503, "WRONG_NETWORK", "The gas station only serves Monad Testnet.");
    const status = await gasStatus(services, owner, address);
    const previous = await refreshDrip(services, owner);
    if (status.gas.state === "sending" && previous) {
      await rebroadcastDrip(services, previous);
      return { txHash: previous.txHash, amount: previous.amount };
    }
    if (["wallet_account", "balance_sufficient"].includes(status.gas.state))
      throw new ApiProblem(
        403,
        "NOT_ELIGIBLE",
        "Gas drips are for passkey accounts with a low balance.",
      );
    if (status.gas.state === "already_received")
      throw new ApiProblem(
        409,
        "GAS_ALREADY_RECEIVED",
        "This account has already received its daily gas drip.",
      );
    if (status.gas.state === "station_empty")
      throw new ApiProblem(
        503,
        "GAS_STATION_EMPTY",
        "The testnet gas station needs a refill.",
        true,
      );
    await recoverPendingTransfers(services, owner);
    const today = new Date().toISOString().slice(0, 10);
    const budget = await services.store.get("gas-budget", today);
    const count = z
      .number()
      .int()
      .nonnegative()
      .parse(budget?.payload.count ?? 0);
    if (count >= 10)
      throw new ApiProblem(
        429,
        "RATE_LIMITED",
        "The gas station's daily testnet budget has been used.",
        true,
        { retryAfterSeconds: 86400 },
      );
    for (const key of [`device:${digest(device)}:${today}`, `network:${ip}:${today}`]) {
      const row = await services.store.get("gas-device", key);
      const accounts = z.array(z.string()).parse(row?.payload.accounts ?? []);
      if (!accounts.includes(owner) && accounts.length >= 3)
        throw new ApiProblem(
          429,
          "RATE_LIMITED",
          "This device has reached its daily gas account limit.",
          true,
          { retryAfterSeconds: 86400 },
        );
    }
    const request = await wallet.prepareTransactionRequest({
      to: getAddress(address),
      value: dripAmount,
    });
    const raw = await wallet.signTransaction(request);
    const txHash = keccak256(raw);
    const payload = {
      raw,
      txHash,
      nonce: request.nonce,
      amount: dripAmount.toString(),
      address,
      createdAt: new Date().toISOString(),
      receivedAt: null,
      state: "sending",
    };
    await services.store.db.transaction(async (tx) => {
      const stage = async (
        kind: string,
        id: string,
        recordOwner: string,
        data: Record<string, unknown>,
      ) => {
        await tx
          .insert(records)
          .values({ kind, id, owner: recordOwner, payload: data })
          .onConflictDoUpdate({
            target: [records.kind, records.id],
            set: { payload: data, updatedAt: new Date() },
          });
      };
      await stage("gas-account", owner, owner, payload);
      await stage("gas-budget", today, "system", { count: count + 1 });
      for (const key of [`device:${digest(device)}:${today}`, `network:${ip}:${today}`]) {
        const row = await services.store.get("gas-device", key);
        const accounts = z.array(z.string()).parse(row?.payload.accounts ?? []);
        await stage("gas-device", key, "system", { accounts: [...new Set([...accounts, owner])] });
      }
      await stage("gas-request", newId(), owner, {
        txHash,
        amount: dripAmount.toString(),
        at: payload.createdAt,
      });
    });
    try {
      const accepted = await services.chain.client.sendRawTransaction({
        serializedTransaction: raw,
      });
      if (accepted !== txHash) throw new Error("Unexpected gas transaction hash");
    } catch {
      throw new ApiProblem(
        503,
        "UPSTREAM_UNAVAILABLE",
        "The gas transfer was signed. Retry to check or resend the same transfer.",
        true,
        { txHash },
      );
    }
    return { txHash, amount: dripAmount.toString() };
  });
