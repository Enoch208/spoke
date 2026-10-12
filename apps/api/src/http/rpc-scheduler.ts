import { ApiProblem } from "./problem.js";

type Job = {
  start: () => Promise<void>;
  cancel: () => void;
};

const unavailable = () =>
  new ApiProblem(503, "UPSTREAM_UNAVAILABLE", "The RPC request queue is busy or timed out.", true);

export const createRpcScheduler = (options: {
  requestsPerSecond: number;
  maxQueued?: number;
  maxConcurrent?: number;
}) => {
  const interval = Math.ceil(1000 / options.requestsPerSecond);
  const queue: Job[] = [];
  let active = 0;
  let nextStart = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pump = () => {
    clearTimeout(timer);
    timer = undefined;
    if (stopped || !queue.length || active >= (options.maxConcurrent ?? 5)) return;
    const delay = nextStart - Date.now();
    if (delay > 0) {
      timer = setTimeout(pump, delay);
      return;
    }
    const job = queue.shift();
    if (!job) return;
    active++;
    nextStart = Date.now() + interval;
    void job.start().finally(() => {
      active--;
      pump();
    });
    pump();
  };
  return {
    schedule<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
      if (stopped || signal.aborted || queue.length >= (options.maxQueued ?? 40))
        return Promise.reject(unavailable());
      return new Promise<T>((resolve, reject) => {
        let started = false;
        const cancel = () => {
          if (started) return;
          const index = queue.indexOf(job);
          if (index >= 0) queue.splice(index, 1);
          signal.removeEventListener("abort", cancel);
          reject(unavailable());
          pump();
        };
        const job: Job = {
          cancel,
          async start() {
            started = true;
            signal.removeEventListener("abort", cancel);
            if (signal.aborted) {
              reject(unavailable());
              return;
            }
            try {
              resolve(await work());
            } catch (error) {
              reject(error instanceof Error ? error : new Error("The RPC request failed."));
            }
          },
        };
        signal.addEventListener("abort", cancel, { once: true });
        queue.push(job);
        pump();
      });
    },
    cooldown(milliseconds: number) {
      nextStart = Math.max(nextStart, Date.now() + milliseconds);
      pump();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      for (const job of [...queue]) job.cancel();
    },
  };
};
