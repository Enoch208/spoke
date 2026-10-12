import { decodeFunctionData, UserRejectedRequestError } from "viem";
import { demoTokenAbi, spokeProtocolAbi } from "@spoke/protocol";
import { describe, expect, it } from "vitest";
import { createRecord, overallStatus } from "@/lib/tx/records";
import { unknownGiveUpMs } from "@/lib/tx/live-step";
import {
  account,
  fakeSigner,
  hashOf,
  purchaseParams,
  receipt,
  revertWith,
  settle,
  setup,
  startPurchase,
} from "./fakes";

describe("purchase through the engine", () => {
  it("approves exactly the price, buys, waits for the index and invalidates", async () => {
    const bundle = setup();
    const id = startPurchase(bundle);
    const record = await settle(bundle, id);
    expect(overallStatus(record)).toBe("done");
    expect(record.steps.map((step) => step.status)).toEqual(["done", "done"]);
    expect(bundle.sent).toHaveLength(2);
    const [approve, purchase] = bundle.sent;
    const approveCall = decodeFunctionData({ abi: demoTokenAbi, data: approve?.data ?? "0x" });
    expect(approveCall.functionName).toBe("approve");
    expect(approveCall.args[1]).toBe(40_000_000n);
    const purchaseCall = decodeFunctionData({
      abi: spokeProtocolAbi,
      data: purchase?.data ?? "0x",
    });
    expect(purchaseCall.functionName).toBe("purchase");
    expect(purchaseCall.args).toEqual([7n, 3n, purchaseParams.orderKey]);
    expect(bundle.invalidated).toEqual([id]);
    expect(bundle.attached).toEqual([hashOf(1), hashOf(2)]);
    expect(bundle.events.at(-1)?.type).toBe("done");
  });

  it("sends an explicit gas limit of the estimate plus ten percent", async () => {
    const bundle = setup({ reader: { estimateGas: () => Promise.resolve(100_001n) } });
    await settle(bundle, startPurchase(bundle));
    expect(bundle.sent[0]?.gas).toBe(110_002n);
    expect(bundle.sent[0]?.maxFeePerGas).toBe(10n);
  });

  it("skips the approval when the allowance already covers the price", async () => {
    const bundle = setup({ reader: { allowance: () => Promise.resolve(40_000_000n) } });
    const record = await settle(bundle, startPurchase(bundle));
    expect(record.steps[0]?.skipped).toBe(true);
    expect(bundle.sent).toHaveLength(1);
  });

  it("refuses to send when SDUSD can't cover the price", async () => {
    const bundle = setup({ reader: { tokenBalance: () => Promise.resolve(1n) } });
    const record = await settle(bundle, startPurchase(bundle));
    expect(record.steps[0]?.status).toBe("failed");
    expect(record.steps[0]?.error?.code).toBe("INSUFFICIENT_SDUSD");
    expect(bundle.sent).toHaveLength(0);
  });

  it("refuses to send when MON can't cover the declared fee", async () => {
    const bundle = setup({
      reader: {
        allowance: () => Promise.resolve(10n ** 12n),
        nativeBalance: () => Promise.resolve(1n),
      },
    });
    const record = await settle(bundle, startPurchase(bundle));
    expect(record.steps[1]?.error).toMatchObject({
      code: "INSUFFICIENT_MON",
      phase: "preflight",
      retryable: true,
    });
    expect(bundle.sent).toHaveLength(0);
  });

  it("decodes a preflight revert and sends nothing", async () => {
    const bundle = setup({
      reader: {
        allowance: () => Promise.resolve(10n ** 12n),
        estimateGas: () => Promise.reject(revertWith("SelfReferral")),
      },
    });
    const record = await settle(bundle, startPurchase(bundle));
    expect(record.steps[1]?.error).toMatchObject({
      code: "SELF_REFERRAL",
      contractError: "SelfReferral",
      phase: "preflight",
    });
    expect(bundle.sent).toHaveLength(0);
    expect(bundle.events.at(-1)?.type).toBe("failed");
  });

  it("treats an already used order key as already done", async () => {
    const bundle = setup({
      reader: {
        allowance: () => Promise.resolve(10n ** 12n),
        estimateGas: () => Promise.reject(revertWith("OrderAlreadyUsed")),
      },
    });
    const record = await settle(bundle, startPurchase(bundle));
    expect(record.steps[1]?.note).toBe("alreadyDone");
    expect(overallStatus(record)).toBe("already_done");
  });

  it("charges the declared gas on a mined revert", async () => {
    const bundle = setup({
      reader: {
        allowance: () => Promise.resolve(10n ** 12n),
        waitForReceipt: () => Promise.resolve(receipt({ status: "reverted", gasUsed: 60_000n })),
        revertName: () => Promise.resolve("CampaignIsPaused"),
      },
    });
    const record = await settle(bundle, startPurchase(bundle));
    expect(record.steps[1]?.error).toMatchObject({
      code: "CAMPAIGN_PAUSED",
      phase: "mined",
      feePaidWei: (110_000n * 2n).toString(),
      retryable: false,
    });
  });

  it("raises the gas margin after running out of gas", async () => {
    const bundle = setup({
      reader: {
        allowance: () => Promise.resolve(10n ** 12n),
        waitForReceipt: () => Promise.resolve(receipt({ status: "reverted", gasUsed: 110_000n })),
      },
    });
    const record = await settle(bundle, startPurchase(bundle));
    expect(record.steps[1]?.error).toMatchObject({ contractError: "OutOfGas", retryable: true });
    expect(record.steps[1]?.gasMarginBps).toBe(3_000);
  });
});

describe("cancelled, retried and resumed", () => {
  it("marks a wallet rejection as cancelled and retries the same record and order key", async () => {
    let attempts = 0;
    const flaky = fakeSigner({
      send: () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new UserRejectedRequestError(new Error("no")))
          : Promise.resolve({ hash: hashOf(7), nonce: 0 });
      },
    });
    const bundle = setup({
      signer: flaky.signer,
      reader: { allowance: () => Promise.resolve(10n ** 12n) },
    });
    const id = startPurchase(bundle);
    const rejected = await settle(bundle, id);
    expect(overallStatus(rejected)).toBe("rejected");
    expect(rejected.steps[1]?.error?.code).toBe("TX_REJECTED");
    bundle.engine.retry(id);
    const retried = await settle(bundle, id);
    expect(overallStatus(retried)).toBe("done");
    expect(retried.params).toMatchObject({ orderKey: purchaseParams.orderKey });
    expect(bundle.store.all()).toHaveLength(1);
  });

  it("opens the running record instead of starting a second one", () => {
    const bundle = setup();
    const first = startPurchase(bundle);
    expect(startPurchase(bundle)).toBe(first);
  });

  it("re-attaches to a sent transaction after reload without sending again", async () => {
    const bundle = setup();
    const id = startPurchase(bundle);
    await settle(bundle, id);
    const sentBefore = bundle.sent.length;
    const record = bundle.store.all()[0];
    if (!record) throw new Error("missing");
    bundle.store.patchStep(id, record.steps[1]?.id ?? "", { status: "submitted" });
    bundle.engine.resumeAfterReload(account, "live");
    await bundle.engine.run(id);
    expect(bundle.sent.length).toBe(sentBefore);
    expect(bundle.events.some((event) => event.type === "resumed")).toBe(true);
  });

  it("turns a step left waiting for the wallet into an interrupted step", () => {
    const bundle = setup();
    const record = createRecord({
      id: "tx-old",
      kind: "purchase",
      params: purchaseParams,
      mode: "live",
      account,
      chainId: 10143,
      now: bundle.clock.now(),
    });
    bundle.store.upsert({
      ...record,
      steps: record.steps.map((step, index) =>
        index === 0 ? { ...step, status: "wallet_confirmation" } : step,
      ),
    });
    bundle.engine.resumeAfterReload(account, "live");
    const after = bundle.store.all().find((item) => item.id === "tx-old");
    expect(after && overallStatus(after)).toBe("interrupted");
    expect(bundle.events.at(-1)?.type).toBe("interrupted");
  });

  it("cancels a run before anything was sent", async () => {
    const bundle = setup({ signer: null });
    const id = startPurchase(bundle);
    await settle(bundle, id);
    expect(bundle.engine.cancel(id)).toBe(true);
    expect(bundle.store.all()).toHaveLength(0);
  });
});

describe("unknown and replaced outcomes", () => {
  const lostAfterBroadcast = {
    allowance: () => Promise.resolve(10n ** 12n),
    waitForReceipt: () => Promise.reject(new Error("rpc lost")),
  };

  it("goes from unknown to included when a receipt appears", async () => {
    let polls = 0;
    const bundle = setup({
      reader: {
        ...lostAfterBroadcast,
        getReceipt: () => {
          polls += 1;
          return Promise.resolve(polls >= 3 ? receipt() : null);
        },
      },
    });
    const record = await settle(bundle, startPurchase(bundle));
    expect(overallStatus(record)).toBe("done");
  });

  it("goes from unknown to replaced when the nonce moves past it", async () => {
    const bundle = setup({
      reader: { ...lostAfterBroadcast, confirmedNonce: () => Promise.resolve(5) },
    });
    const record = await settle(bundle, startPurchase(bundle));
    expect(record.steps[1]).toMatchObject({ status: "replaced", replacedReason: "replaced" });
  });

  it("fails as never included after thirty minutes", async () => {
    const bundle = setup({
      reader: { ...lostAfterBroadcast, confirmedNonce: () => Promise.resolve(0) },
    });
    const started = bundle.clock.current();
    const record = await settle(bundle, startPurchase(bundle));
    expect(record.steps[1]?.error).toMatchObject({ phase: "never_included", retryable: true });
    expect(bundle.clock.current() - started).toBeGreaterThanOrEqual(unknownGiveUpMs);
  });

  it("follows a repriced replacement and stops on a cancellation", async () => {
    const repriced = setup({
      reader: {
        allowance: () => Promise.resolve(10n ** 12n),
        waitForReceipt: (_hash, options) => {
          options.onReplaced({ reason: "repriced", hash: hashOf(99) });
          return Promise.resolve(receipt());
        },
      },
    });
    const followed = await settle(repriced, startPurchase(repriced));
    expect(followed.steps[1]?.hash).toBe(hashOf(99));
    expect(overallStatus(followed)).toBe("done");

    const cancelled = setup({
      reader: {
        allowance: () => Promise.resolve(10n ** 12n),
        waitForReceipt: (_hash, options) => {
          options.onReplaced({ reason: "cancelled", hash: hashOf(98) });
          return Promise.resolve(receipt());
        },
      },
    });
    const stopped = await settle(cancelled, startPurchase(cancelled));
    expect(stopped.steps[1]).toMatchObject({ status: "replaced", replacedReason: "cancelled" });
  });
});

describe("preflight blocks", () => {
  it("stops a wallet on the wrong network", async () => {
    const wrongChain = fakeSigner({ chainId: () => Promise.resolve(1) });
    const bundle = setup({ signer: wrongChain.signer });
    const record = await settle(bundle, startPurchase(bundle));
    expect(record.steps[0]?.error?.code).toBe("WRONG_NETWORK");
  });

  it("stops when the contracts aren't deployed", async () => {
    const bundle = setup({ addresses: null });
    const record = await settle(bundle, startPurchase(bundle));
    expect(record.steps[0]?.error?.code).toBe("PROTOCOL_NOT_DEPLOYED");
  });

  it("marks the record syncing when the index lags past thirty seconds", async () => {
    let calls = 0;
    const bundle = setup({
      reader: { allowance: () => Promise.resolve(10n ** 12n) },
      indexed: () => {
        calls += 1;
        return Promise.resolve(calls > 20 ? 1_000n : 10n);
      },
    });
    const record = await settle(bundle, startPurchase(bundle));
    expect(bundle.events.some((event) => event.type === "syncing")).toBe(true);
    expect(overallStatus(record)).toBe("done");
  });
});
