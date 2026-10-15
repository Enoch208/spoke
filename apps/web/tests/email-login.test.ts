import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  ready: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
  disconnect: vi.fn(),
  create: vi.fn(),
  emailEnabled: true,
  account: undefined as
    | undefined
    | {
        address: string;
        isConnected: boolean;
        embeddedWalletInfo?: { authProvider: string };
      },
  connection: { status: "disconnected", address: "" },
  accountListeners: new Set<() => void>(),
  connectionListeners: new Set<() => void>(),
  stateListeners: new Set<(state: { open: boolean }) => void>(),
}));

vi.mock("../src/lib/public-env", () => ({
  publicEnv: { NEXT_PUBLIC_REOWN_PROJECT_ID: "a".repeat(32) },
}));
vi.mock("../src/lib/wagmi", () => ({
  reownAdapter: {},
  wagmiConfig: {},
  activeChain: { id: 10143 },
}));
vi.mock("wagmi/actions", () => ({
  getConnection: () => fake.connection,
  watchConnection: (_: unknown, options: { onChange: () => void }) => {
    fake.connectionListeners.add(options.onChange);
    return () => fake.connectionListeners.delete(options.onChange);
  },
}));
vi.mock("@reown/appkit/react", () => ({
  createAppKit: (options: unknown) => {
    fake.create(options);
    return {
      ready: fake.ready,
      open: fake.open,
      close: fake.close,
      disconnect: fake.disconnect,
      getRemoteFeatures: () => ({ email: fake.emailEnabled }),
      getAccount: () => fake.account,
      subscribeAccount: (callback: () => void) => {
        fake.accountListeners.add(callback);
        return () => fake.accountListeners.delete(callback);
      },
      subscribeState: (callback: (state: { open: boolean }) => void) => {
        fake.stateListeners.add(callback);
        return () => fake.stateListeners.delete(callback);
      },
    };
  },
}));

const address = "0x1111111111111111111111111111111111111111";
const otherAddress = "0x2222222222222222222222222222222222222222";
let reown: typeof import("../src/lib/accounts/reown");
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};
const connect = (email: boolean, connectedAddress = address) => {
  fake.account = {
    address,
    isConnected: true,
    ...(email ? { embeddedWalletInfo: { authProvider: "email" } } : {}),
  };
  fake.connection = { status: "connected", address: connectedAddress };
  fake.accountListeners.forEach((callback) => {
    callback();
  });
  fake.connectionListeners.forEach((callback) => {
    callback();
  });
};
const expectClean = () => {
  expect(fake.accountListeners.size).toBe(0);
  expect(fake.connectionListeners.size).toBe(0);
  expect(fake.stateListeners.size).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
};

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal("location", { origin: "https://usespoke.xyz" });
  fake.emailEnabled = true;
  fake.account = undefined;
  fake.connection = { status: "disconnected", address: "" };
  fake.accountListeners.clear();
  fake.connectionListeners.clear();
  fake.stateListeners.clear();
  fake.ready.mockResolvedValue(undefined);
  fake.close.mockResolvedValue(undefined);
  fake.disconnect.mockResolvedValue(undefined);
  fake.open.mockImplementation(() => {
    fake.stateListeners.forEach((callback) => {
      callback({ open: true });
    });
    return Promise.resolve();
  });
  reown = await import("../src/lib/accounts/reown");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("email wallet connection", () => {
  it("opens email verification and resolves only the matching embedded wallet", async () => {
    const result = reown.openEmailConnection(new AbortController().signal);
    await flush();
    expect(fake.open).toHaveBeenCalledWith({ view: "Connect" });
    await vi.advanceTimersByTimeAsync(13 * 60_000);
    connect(true);
    expect(await result).toBe(address);
    expectClean();
  });

  it("does not silently sign in a previously connected external wallet", async () => {
    connect(false);
    const result = reown.openEmailConnection(new AbortController().signal);
    await flush();
    expect(fake.open).toHaveBeenCalledWith({ view: "Connect" });
    connect(true);
    expect(await result).toBe(address);
    expectClean();
  });

  it("waits for Wagmi to select the same account before allowing the backend sign-in", async () => {
    const result = reown.openEmailConnection(new AbortController().signal);
    await flush();
    connect(true, otherAddress);
    expect(fake.close).not.toHaveBeenCalled();
    fake.connection = { status: "connected", address };
    fake.connectionListeners.forEach((callback) => {
      callback();
    });
    expect(await result).toBe(address);
    expectClean();
  });

  it("restores an existing email wallet without requesting another OTP", async () => {
    connect(true);
    expect(await reown.openEmailConnection(new AbortController().signal)).toBe(address);
    expect(fake.open).not.toHaveBeenCalled();
    expectClean();
  });

  it("cancels when the email window closes and removes subscriptions", async () => {
    const result = reown.openEmailConnection(new AbortController().signal);
    await flush();
    fake.stateListeners.forEach((callback) => {
      callback({ open: false });
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(await result).toBeNull();
    expectClean();
  });

  it("allows a successful connection to arrive just after the provider closes", async () => {
    const result = reown.openEmailConnection(new AbortController().signal);
    await flush();
    fake.stateListeners.forEach((callback) => {
      callback({ open: false });
    });
    connect(true);
    expect(await result).toBe(address);
    expectClean();
  });

  it("aborts when the caller leaves the page", async () => {
    const abort = new AbortController();
    const result = reown.openEmailConnection(abort.signal);
    await flush();
    abort.abort();
    expect(await result).toBeNull();
    expectClean();
  });

  it("fails clearly if the project disables email", async () => {
    fake.emailEnabled = false;
    await expect(reown.openEmailConnection(new AbortController().signal)).rejects.toThrow(
      "temporarily unavailable",
    );
    expect(fake.open).not.toHaveBeenCalled();
    expectClean();
  });

  it("releases a stalled SDK startup without opening a late sign-in window", async () => {
    let ready: (() => void) | undefined;
    fake.ready.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          ready = resolve;
        }),
    );
    const result = expect(reown.openEmailConnection(new AbortController().signal)).rejects.toThrow(
      "sign-in service did not load",
    );
    await vi.advanceTimersByTimeAsync(20_000);
    await result;
    ready?.();
    await flush();
    expect(fake.open).not.toHaveBeenCalled();
    expectClean();
    const retry = reown.openEmailConnection(new AbortController().signal);
    await flush();
    connect(true);
    expect(await retry).toBe(address);
    expectClean();
  });

  it("cleans up after a provider failure or expired attempt", async () => {
    fake.open.mockRejectedValueOnce(new Error("Provider unavailable"));
    await expect(reown.openEmailConnection(new AbortController().signal)).rejects.toThrow(
      "Provider unavailable",
    );
    expectClean();
    const expired = expect(reown.openEmailConnection(new AbortController().signal)).rejects.toThrow(
      "timed out",
    );
    await flush();
    await vi.advanceTimersByTimeAsync(1_800_000);
    await expired;
    expectClean();
  });

  it("initializes once and disconnects only embedded wallets on sign-out", async () => {
    await reown.initializeWalletConnection();
    await reown.initializeWalletConnection();
    expect(fake.create).toHaveBeenCalledTimes(1);
    connect(false);
    await reown.disconnectEmailWallet();
    expect(fake.disconnect).not.toHaveBeenCalled();
    connect(true);
    await reown.disconnectEmailWallet();
    expect(fake.disconnect).toHaveBeenCalledWith("eip155");
  });
});
