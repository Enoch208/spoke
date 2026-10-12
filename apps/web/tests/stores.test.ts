import { beforeEach, describe, expect, it } from "vitest";
import { useCheckoutStore } from "@/lib/stores/checkout";
import { useDemoStore } from "@/lib/stores/demo";
import { useSessionStore } from "@/lib/stores/session";
import { isBannerDismissed, maxModalStack, useUiStore } from "@/lib/stores/ui";
import { workspaceForPath } from "@/lib/stores/workspace";

const reset = () => {
  useUiStore.setState({ modals: [], toasts: [], dismissedBanners: {}, paletteOpen: false });
  useCheckoutStore.setState({ drafts: {} });
  useSessionStore.getState().signOut();
};

describe("modal stack", () => {
  beforeEach(reset);

  it("keeps at most three modals and replaces the top one", () => {
    const { open } = useUiStore.getState();
    open("M-17", { campaignId: "1" });
    open("M-11", { txId: "a" });
    open("M-06", {});
    open("M-05", { currentChainId: 1 });
    const ids = useUiStore.getState().modals.map((modal) => modal.id);
    expect(ids).toHaveLength(maxModalStack);
    expect(ids).toEqual(["M-17", "M-11", "M-05"]);
  });

  it("always keeps the session-expired dialog on top", () => {
    const { open } = useUiStore.getState();
    open("M-12", { campaignId: "1" });
    open("M-08", { expectedAddress: "0x1", accountKind: "passkey" });
    open("M-11", { txId: "a" });
    expect(useUiStore.getState().modals.map((modal) => modal.id)).toEqual(["M-12", "M-11", "M-08"]);
  });

  it("closes the top modal or a modal by key", () => {
    const { open, close } = useUiStore.getState();
    const first = open("M-23", { campaignId: "1" });
    open("M-11", { txId: "a" });
    close();
    expect(useUiStore.getState().modals.map((modal) => modal.id)).toEqual(["M-23"]);
    close(first);
    expect(useUiStore.getState().modals).toEqual([]);
  });
});

describe("toasts", () => {
  beforeEach(reset);

  it("updates the same toast for the same subject in place", () => {
    const { pushToast } = useUiStore.getState();
    const first = pushToast({
      id: "T-26",
      subject: "tx-1",
      tone: "info",
      message: "Waiting",
      durationMs: null,
    });
    const second = pushToast({
      id: "T-26",
      subject: "tx-1",
      tone: "info",
      message: "Still waiting",
      durationMs: null,
    });
    pushToast({ id: "T-26", subject: "tx-2", tone: "info", message: "Other", durationMs: null });
    const { toasts } = useUiStore.getState();
    expect(second).toBe(first);
    expect(toasts).toHaveLength(2);
    expect(toasts[0]?.message).toBe("Still waiting");
  });
});

describe("banner dismissal", () => {
  it("expires timed dismissals and scopes session ones to the browser session", () => {
    expect(isBannerDismissed(undefined, 0, "s")).toBe(false);
    expect(isBannerDismissed({ until: 1_000, session: null }, 999, "s")).toBe(true);
    expect(isBannerDismissed({ until: 1_000, session: null }, 1_000, "s")).toBe(false);
    expect(isBannerDismissed({ until: null, session: "s" }, 0, "s")).toBe(true);
    expect(isBannerDismissed({ until: null, session: "s" }, 0, "next")).toBe(false);
  });
});

describe("checkout drafts", () => {
  beforeEach(reset);

  it("reuses the order key for the same campaign and link", () => {
    const { startDraft } = useCheckoutStore.getState();
    const first = startDraft("7", "3");
    const again = startDraft("7", "3");
    expect(again.orderKey).toBe(first.orderKey);
    expect(first.orderKey).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("starts a new order key when the link changes", () => {
    const { startDraft } = useCheckoutStore.getState();
    const referred = startDraft("7", "3");
    const direct = startDraft("7", null);
    expect(direct.orderKey).not.toBe(referred.orderKey);
  });

  it("clears a draft", () => {
    const { startDraft, clearDraft } = useCheckoutStore.getState();
    startDraft("7", null);
    clearDraft("7");
    expect(useCheckoutStore.getState().drafts).toEqual({});
  });
});

describe("session", () => {
  beforeEach(reset);

  it("expires only a signed-in session", () => {
    const store = useSessionStore.getState();
    store.expire();
    expect(useSessionStore.getState().status).toBe("anonymous");
    store.signIn({
      address: "0x0000000000000000000000000000000000000001",
      accountKind: "wallet",
      sessionExpiresAt: "2026-10-13T00:00:00Z",
      isMerchant: false,
      isOperator: false,
    });
    useSessionStore.getState().expire();
    expect(useSessionStore.getState().status).toBe("expired");
  });
});

describe("demo store", () => {
  it("resets the sample world and bumps its revision", () => {
    const before = useDemoStore.getState().revision;
    useDemoStore.getState().advanceClock(600);
    useDemoStore.getState().reset();
    expect(useDemoStore.getState().revision).toBe(before + 1);
    expect(useDemoStore.getState().clockOffsetSeconds).toBe(0);
  });
});

describe("workspace from path", () => {
  it("reads the workspace from the route", () => {
    expect(workspaceForPath("/sell/campaigns")).toBe("sell");
    expect(workspaceForPath("/earn")).toBe("earn");
    expect(workspaceForPath("/sellers")).toBeNull();
  });
});
