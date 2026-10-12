import { afterEach, describe, expect, it, vi } from "vitest";
import { rpcProbe } from "../src/chain.js";
import { createRpcFetch } from "../src/http/rpc-fetch.js";
import { createRpcScheduler } from "../src/http/rpc-scheduler.js";
import { createChainService } from "../src/services/chain.js";

const endpoint = "https://rpc.example/private-provider-token";
const request = (method = "eth_chainId") => ({
  method: "POST",
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
});
const reply = () => Response.json({ jsonrpc: "2.0", id: 1, result: "0x279f" });
afterEach(() => vi.useRealTimers());

describe("shared RPC scheduling", () => {
  it("spaces chain, health and proxy fetches through the same scheduler", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const starts: number[] = [];
    const rpc = createRpcFetch({
      fetcher: () => {
        starts.push(Date.now());
        return Promise.resolve(reply());
      },
    });
    const chain = createChainService(endpoint, 10143, null, null, rpc.fetch);
    const pending = [
      chain.client.getChainId(),
      rpcProbe(endpoint, 10143, rpc.fetch)(),
      rpc.fetch(endpoint, request()),
    ];
    await vi.advanceTimersByTimeAsync(401);
    expect(await Promise.all(pending)).toMatchObject([10143, "ok", { status: 200 }]);
    expect(starts).toEqual([0, 200, 400]);
    rpc.stop();
  });

  it("bounds the queue, removes cancelled work and continues after failures", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const scheduler = createRpcScheduler({ requestsPerSecond: 5, maxQueued: 1, maxConcurrent: 1 });
    const signal = new AbortController().signal;
    let release: (value: number) => void = () => undefined;
    const first = scheduler.schedule(
      () =>
        new Promise<number>((resolve) => {
          release = resolve;
        }),
      signal,
    );
    const abort = new AbortController();
    const cancelledWork = vi.fn(() => Promise.resolve(2));
    const cancelled = scheduler
      .schedule(cancelledWork, abort.signal)
      .catch((error: unknown) => error);
    await expect(scheduler.schedule(() => Promise.resolve(3), signal)).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
      status: 503,
    });
    abort.abort();
    expect(await cancelled).toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
    const failure = scheduler
      .schedule(() => Promise.reject(new Error("fixture failure")), signal)
      .catch((error: unknown) => error);
    release(1);
    expect(await first).toBe(1);
    await vi.advanceTimersByTimeAsync(200);
    expect(await failure).toMatchObject({ message: "fixture failure" });
    expect(cancelledWork).not.toHaveBeenCalled();
    const next = scheduler.schedule(() => Promise.resolve(4), signal);
    await vi.advanceTimersByTimeAsync(200);
    expect(await next).toBe(4);
    scheduler.stop();
    await expect(scheduler.schedule(() => Promise.resolve(5), signal)).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    });
  });

  it("honours provider cooldown globally and retries read requests with bounded backoff", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const starts: number[] = [];
    const bodies: unknown[] = [];
    const rpc = createRpcFetch({
      fetcher: (_input, init) => {
        starts.push(Date.now());
        bodies.push(init?.body);
        return Promise.resolve(
          starts.length === 1
            ? new Response("limited", { status: 429, headers: { "retry-after": "1" } })
            : reply(),
        );
      },
    });
    const read = rpc.fetch(endpoint, request());
    await vi.advanceTimersByTimeAsync(0);
    const concurrent = rpc.fetch(endpoint, request("eth_blockNumber"));
    await vi.advanceTimersByTimeAsync(1200);
    expect((await read).status).toBe(200);
    expect((await concurrent).status).toBe(200);
    expect(starts).toEqual([0, 1000, 1200]);
    expect(bodies[0]).toBe(bodies[1]);
    rpc.stop();
  });

  it("caps rate-limit retries and never retries a signed broadcast", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const send = vi.fn(() => Promise.resolve(new Response("limited", { status: 429 })));
    const rpc = createRpcFetch({ fetcher: send });
    const read = rpc.fetch(endpoint, request());
    await vi.advanceTimersByTimeAsync(1500);
    expect((await read).status).toBe(429);
    expect(send).toHaveBeenCalledTimes(3);
    const raw = rpc.fetch(endpoint, request("eth_sendRawTransaction"));
    await vi.advanceTimersByTimeAsync(2000);
    expect((await raw).status).toBe(429);
    expect(send).toHaveBeenCalledTimes(4);
    rpc.stop();
  });

  it("cancels an active request and expires queued requests before they reach the provider", async () => {
    const send = vi.fn(
      (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              reject(new Error(endpoint));
            },
            { once: true },
          );
        }),
    );
    const rpc = createRpcFetch({ fetcher: send, timeoutMs: 30, maxConcurrent: 1 });
    const pending = [rpc.fetch(endpoint, request()), rpc.fetch(endpoint, request())].map((value) =>
      value.catch((error: unknown) => error),
    );
    const errors = await Promise.all(pending);
    expect(errors).toEqual([
      expect.objectContaining({ code: "UPSTREAM_UNAVAILABLE", status: 503 }),
      expect.objectContaining({ code: "UPSTREAM_UNAVAILABLE", status: 503 }),
    ]);
    expect(JSON.stringify(errors)).not.toContain("private-provider-token");
    expect(send).toHaveBeenCalledTimes(1);
    rpc.stop();
  });

  it("does not retry network failures or modify successful RPC errors", async () => {
    const failed = vi.fn(() => Promise.reject(new Error(endpoint)));
    const rpc = createRpcFetch({ fetcher: failed });
    await expect(rpc.fetch(endpoint, request("eth_sendRawTransaction"))).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
      message: "The RPC request timed out or failed.",
    });
    expect(failed).toHaveBeenCalledTimes(1);
    rpc.stop();
    const rejected = {
      jsonrpc: "2.0",
      id: 1,
      error: { code: 3, message: "execution reverted", data: "0x1234" },
    };
    const read = createRpcFetch({ fetcher: () => Promise.resolve(Response.json(rejected)) });
    expect(await (await read.fetch(endpoint, request("eth_call"))).json()).toEqual(rejected);
    read.stop();
  });
});
