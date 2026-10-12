import { z } from "zod";
import { ApiProblem } from "./problem.js";
import { createRpcScheduler } from "./rpc-scheduler.js";

const readMethods = new Set([
  "eth_call",
  "eth_estimateGas",
  "eth_chainId",
  "eth_blockNumber",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getCode",
  "eth_getBalance",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_getLogs",
]);
const retryableRead = (body: BodyInit | null | undefined) => {
  if (typeof body !== "string") return false;
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return false;
  }
  const request = z.object({ method: z.string() }).safeParse(value);
  return request.success && readMethods.has(request.data.method);
};
const retryDelay = (response: Response, attempt: number) => {
  const header = response.headers.get("retry-after");
  const parsed = header
    ? /^\d+(?:\.\d+)?$/.test(header)
      ? Number(header) * 1000
      : Date.parse(header) - Date.now()
    : 0;
  return Math.min(5000, Math.max(500 * 2 ** attempt, Number.isFinite(parsed) ? parsed : 0));
};

export const createRpcFetch = (
  options: {
    requestsPerSecond?: number;
    maxQueued?: number;
    maxConcurrent?: number;
    timeoutMs?: number;
    fetcher?: typeof fetch;
  } = {},
) => {
  const scheduler = createRpcScheduler({
    requestsPerSecond: options.requestsPerSecond ?? 5,
    maxQueued: options.maxQueued ?? 40,
    maxConcurrent: options.maxConcurrent ?? 5,
  });
  const shutdown = new AbortController();
  const fetcher: typeof fetch = async (input, init) => {
    const caller = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const signal = AbortSignal.any([
      shutdown.signal,
      AbortSignal.timeout(options.timeoutMs ?? 8000),
      ...(caller ? [caller] : []),
    ]);
    const canRetry = retryableRead(init?.body);
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await scheduler.schedule(
          () => (options.fetcher ?? fetch)(input, { ...init, signal }),
          signal,
        );
      } catch (error) {
        if (error instanceof ApiProblem) throw error;
        throw new ApiProblem(
          503,
          "UPSTREAM_UNAVAILABLE",
          "The RPC request timed out or failed.",
          true,
        );
      }
      if (response.status !== 429) return response;
      scheduler.cooldown(retryDelay(response, attempt));
      if (!canRetry || attempt >= 2) return response;
      await response.body?.cancel();
    }
  };
  return {
    fetch: fetcher,
    stop() {
      shutdown.abort();
      scheduler.stop();
    },
  };
};
