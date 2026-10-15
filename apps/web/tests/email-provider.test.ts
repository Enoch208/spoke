import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { W3mFrameProvider } from "@reown/appkit-wallet";

type FrameEvent = { id: string; type: string; payload?: unknown };

const createProvider = () => {
  const abort = new AbortController();
  const onTimeout = vi.fn();
  const provider = new W3mFrameProvider({
    projectId: "a".repeat(32),
    enableLogger: false,
    abortController: abort,
    onTimeout,
    getCaipNetworks: () => [],
    getActiveCaipNetwork: () => undefined,
    metadata: { name: "Spoke", description: "Test", url: "https://usespoke.xyz", icons: [] },
    sdkVersion: "react-wagmi-2.0.0",
    sdkType: "appkit",
  });
  const handlers = new Map<string, (event: FrameEvent) => void>();
  const requests: FrameEvent[] = [];
  const replies = new Map<string, unknown>([
    ["SYNC_DAPP_DATA", undefined],
    ["GET_SMART_ACCOUNT_ENABLED_NETWORKS", { smartAccountEnabledNetworks: [] }],
    ["CONNECT_EMAIL", { action: "VERIFY_OTP" }],
    ["CONNECT_OTP", undefined],
    ["RPC_ABORT", undefined],
  ]);
  let ready = () => {};
  const frame = {
    initFrame: vi.fn(),
    frameLoadPromise: new Promise<void>((resolve) => {
      ready = resolve;
    }),
    events: {
      registerFrameEventHandler: (
        id: string,
        callback: (event: FrameEvent) => void,
        signal: AbortSignal,
      ) => {
        handlers.set(id, callback);
        signal.addEventListener("abort", () => handlers.delete(id), { once: true });
      },
      postAppEvent: (event: FrameEvent) => {
        requests.push(event);
        const type = event.type.replace("@w3m-app/", "");
        if (replies.has(type))
          handlers.get(event.id)?.({
            id: event.id,
            type: `@w3m-frame/${type}_SUCCESS`,
            payload: replies.get(type),
          });
      },
    },
  };
  Reflect.set(provider, "w3mFrame", frame);
  return { provider, frame, ready, handlers, requests, replies, abort, onTimeout };
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("pinned email provider timeout recovery", () => {
  it("rejects a missing frame within 20 seconds and retries when the frame recovers", async () => {
    const p = createProvider();
    const failed = expect(p.provider.connectEmail({ email: "test@example.com" })).rejects.toThrow(
      "could not load",
    );
    await vi.advanceTimersByTimeAsync(20_000);
    await failed;
    expect(p.requests).toHaveLength(0);
    expect(p.onTimeout).toHaveBeenCalledWith("iframe_load_failed");
    expect(p.abort.signal.aborted).toBe(false);
    p.ready();
    expect(await p.provider.connectEmail({ email: "test@example.com" })).toEqual({
      action: "VERIFY_OTP",
    });
    expect(p.requests.filter((e) => e.type.endsWith("CONNECT_EMAIL"))).toHaveLength(1);
    expect(p.handlers.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds metadata initialization and cleans up before a retry", async () => {
    const p = createProvider();
    p.ready();
    p.replies.delete("SYNC_DAPP_DATA");
    const failed = expect(p.provider.init()).rejects.toThrow("did not respond");
    await vi.advanceTimersByTimeAsync(20_000);
    await failed;
    expect(p.handlers.size).toBe(0);
    p.replies.set("SYNC_DAPP_DATA", undefined);
    await p.provider.init();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits for the complete handshake for concurrent initialization calls", async () => {
    const p = createProvider();
    p.ready();
    p.replies.delete("SYNC_DAPP_DATA");
    let completed = 0;
    const first = p.provider.init().then(() => {
      completed++;
    });
    const second = p.provider.init().then(() => {
      completed++;
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(completed).toBe(0);
    const request = p.requests[0];
    if (!request) throw new Error("Expected the metadata request");
    p.handlers.get(request.id)?.({ id: request.id, type: "@w3m-frame/SYNC_DAPP_DATA_SUCCESS" });
    await Promise.all([first, second]);
    expect(completed).toBe(2);
    expect(p.frame.initFrame).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects a stalled email request and ignores its late response while allowing retry", async () => {
    const p = createProvider();
    p.ready();
    p.replies.delete("CONNECT_EMAIL");
    const failed = expect(p.provider.connectEmail({ email: "test@example.com" })).rejects.toThrow(
      "did not respond",
    );
    await vi.advanceTimersByTimeAsync(60_000);
    await failed;
    expect(p.handlers.size).toBe(0);
    expect(p.abort.signal.aborted).toBe(false);
    p.replies.set("CONNECT_EMAIL", { action: "VERIFY_OTP" });
    expect(await p.provider.connectEmail({ email: "test@example.com" })).toEqual({
      action: "VERIFY_OTP",
    });
    expect(p.handlers.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects stalled OTP verification instead of reporting a successful login", async () => {
    const p = createProvider();
    p.ready();
    p.replies.delete("CONNECT_OTP");
    const failed = expect(p.provider.connectOtp({ otp: "123456" })).rejects.toThrow(
      "did not respond",
    );
    await vi.advanceTimersByTimeAsync(60_000);
    await failed;
    expect(p.handlers.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("allows device approval after the email-request deadline and completes the pending request", async () => {
    const p = createProvider();
    p.ready();
    const approved = p.provider.connectDevice();
    await vi.advanceTimersByTimeAsync(13 * 60_000);
    expect(p.onTimeout).not.toHaveBeenCalled();
    const request = p.requests.find((event) => event.type.endsWith("CONNECT_DEVICE"));
    if (!request) throw new Error("Expected the device approval request");
    p.handlers.get(request.id)?.({ id: request.id, type: "@w3m-frame/CONNECT_DEVICE_SUCCESS" });
    await expect(approved).resolves.toBeUndefined();
    expect(p.handlers.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("expires device approval after the advertised window and permits another attempt", async () => {
    const p = createProvider();
    p.ready();
    const expired = expect(p.provider.connectDevice()).rejects.toThrow("did not respond");
    await vi.advanceTimersByTimeAsync(20 * 60_000);
    await expired;
    expect(p.handlers.size).toBe(0);
    expect(p.abort.signal.aborted).toBe(false);
    p.replies.set("CONNECT_DEVICE", undefined);
    await expect(p.provider.connectDevice()).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps wallet signing outside the email deadline and still cancels pending signatures", async () => {
    const p = createProvider();
    p.ready();
    const failed = expect(
      p.provider.request({ method: "personal_sign", params: [] }),
    ).rejects.toThrow("aborted");
    await vi.advanceTimersByTimeAsync(120_000);
    expect(p.handlers.size).toBe(1);
    expect(p.onTimeout).not.toHaveBeenCalled();
    await p.provider.rejectRpcRequests();
    await failed;
    expect(p.handlers.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects and cleans up when the global provider is aborted", async () => {
    const p = createProvider();
    p.ready();
    p.replies.delete("CONNECT_EMAIL");
    const failed = expect(p.provider.connectEmail({ email: "test@example.com" })).rejects.toThrow(
      "aborted",
    );
    await vi.advanceTimersByTimeAsync(1);
    p.abort.abort();
    await failed;
    expect(p.handlers.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
