import { contractErrorCodes } from "@spoke/protocol";
import { describe, expect, it } from "vitest";
import { actions, needsPasskeyPrompt, planSteps, resumeKeyFor } from "@/lib/tx/actions";
import { contractErrorCode } from "@/lib/tx/errors";
import type { TxKind } from "@/lib/tx/types";

const allKinds = Object.keys(actions).filter((kind): kind is TxKind =>
  Object.hasOwn(actions, kind),
);

describe("quick actions", () => {
  it("skips the passkey only for routine actions and purchases up to the cap", () => {
    const quick = allKinds.filter((kind) => !needsPasskeyPrompt(kind, true, 0n, 100n));
    expect(quick.sort()).toEqual(
      [
        "claimProceeds",
        "claimRewards",
        "createNode",
        "finalize",
        "mintDemoTokens",
        "pause",
        "purchase",
        "resume",
      ].sort(),
    );
    expect(needsPasskeyPrompt("purchase", true, 100n, 100n)).toBe(false);
    expect(needsPasskeyPrompt("purchase", true, 101n, 100n)).toBe(true);
    expect(needsPasskeyPrompt("createNode", false, 0n, 100n)).toBe(true);
  });
});

describe("step plans", () => {
  it("finalizes at most ten sales before claiming", () => {
    const saleIds = Array.from({ length: 12 }, (_, index) => String(index + 1));
    const steps = planSteps("claimRewards", {
      token: "0x00000000000000000000000000000000000000bb",
      amount: "1",
      finalizeSaleIds: saleIds,
    });
    expect(steps.filter((step) => step.kind === "finalize")).toHaveLength(10);
    expect(steps.at(-1)).toMatchObject({ kind: "claimRewards", waitsForIndex: true });
  });

  it("claims proceeds once per campaign and indexes only the last claim", () => {
    const steps = planSteps("claimProceeds", {
      campaignIds: ["9", "3"],
      campaignName: null,
      amount: "1",
      finalizeSaleIds: ["5"],
    });
    expect(steps.map((step) => `${step.kind}:${step.target ?? ""}`)).toEqual([
      "finalize:5",
      "claimProceeds:3",
      "claimProceeds:9",
    ]);
    expect(steps.map((step) => step.waitsForIndex)).toEqual([false, false, true]);
  });

  it("keys a purchase by its order key so a reload never starts a second one", () => {
    expect(
      resumeKeyFor(
        "purchase",
        {
          campaignId: "7",
          nodeId: "0",
          orderKey: "0x01",
          price: "1",
          productTitle: "x",
          merchantName: "y",
          intentId: null,
        },
        1,
      ),
    ).toBe("purchase:7:0x01");
  });
});

describe("contract errors", () => {
  it("maps every contract error name to a code", () => {
    for (const name of Object.keys(contractErrorCodes)) {
      expect(contractErrorCode(name)).toBeTruthy();
    }
    expect(contractErrorCode("ERC20InsufficientBalance")).toBe("INSUFFICIENT_SDUSD");
    expect(contractErrorCode("CampaignActive")).toBe("VALIDATION_FAILED");
  });
});
