import type { ClientInput, ClientMethod, ClientOutput } from "@spoke/protocol";
import { useSignalsStore } from "@/lib/stores/signals";
import { isClientError } from "../errors";
import type { SpokeClient } from "../types";
import { readCsrfToken, writeCsrfToken } from "./csrf";
import { callLive, type HttpConfig } from "./http";

export type LiveClientOptions = {
  apiUrl: string;
  onUnauthenticated?: (method: ClientMethod) => void;
  fetcher?: typeof fetch;
};

const unreachableCodes = new Set(["API_UNREACHABLE", "TIMEOUT"]);

const rememberCsrf = (method: ClientMethod, output: unknown) => {
  if (method === "auth.signOut") writeCsrfToken(null);
  if (method !== "auth.verify" || typeof output !== "object" || output === null) return;
  if ("csrfToken" in output && typeof output.csrfToken === "string") {
    writeCsrfToken(output.csrfToken);
  }
};

export const createLiveClient = (options: LiveClientOptions): SpokeClient => {
  const signals = useSignalsStore.getState;
  const config: HttpConfig = {
    apiBase: `${options.apiUrl.replace(/\/$/, "")}/v1`,
    csrfToken: readCsrfToken,
    onMeta: (meta) => {
      signals().recordApiSuccess(meta.indexingStatus, meta.blockNumber);
    },
    ...(options.onUnauthenticated ? { onUnauthenticated: options.onUnauthenticated } : {}),
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
  };
  const call = async <M extends ClientMethod>(
    method: M,
    input: ClientInput<M>,
  ): Promise<ClientOutput<M>> => {
    try {
      const output = await callLive(config, method, input);
      rememberCsrf(method, output);
      return output;
    } catch (error) {
      if (isClientError(error) && unreachableCodes.has(error.code)) signals().recordApiFailure();
      if (isClientError(error) && error.code === "UNAUTHENTICATED") writeCsrfToken(null);
      throw error;
    }
  };
  return { mode: "live", call };
};
