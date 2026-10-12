"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { publicEnv } from "@/lib/public-env";
import { useStoresHydrated } from "@/lib/stores/hydration";
import { selectMode, useModeStore, type Mode } from "@/lib/stores/mode";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { createLiveClient } from "./live";
import type { SpokeClient } from "./types";

export type DemoClientLoader = () => Promise<SpokeClient>;
export type DemoClientStatus = "idle" | "loading" | "ready" | "failed";

type ClientContextValue = {
  client: SpokeClient | null;
  live: SpokeClient;
  mode: Mode;
  demoStatus: DemoClientStatus;
  retryDemo: () => void;
};

const ClientContext = createContext<ClientContextValue | null>(null);

const openSessionExpired = () => {
  const session = useSessionStore.getState();
  if (session.status !== "signedIn" || !session.address || !session.accountKind) return;
  session.expire();
  useUiStore
    .getState()
    .open("M-08", { expectedAddress: session.address, accountKind: session.accountKind });
};

export const demoStatusOf = (state: {
  mode: Mode;
  ready: boolean;
  available: boolean;
  failed: boolean;
}): DemoClientStatus => {
  if (state.mode !== "demo") return "idle";
  if (state.ready) return "ready";
  if (!state.available || state.failed) return "failed";
  return "loading";
};

export function ClientProvider({
  children,
  loadDemoClient,
}: {
  children: ReactNode;
  loadDemoClient?: DemoClientLoader;
}) {
  const hydrated = useStoresHydrated();
  const mode = useModeStore(selectMode);
  const persona = useModeStore((state) => state.persona);
  const queryClient = useQueryClient();
  const live = useMemo(
    () =>
      createLiveClient({
        apiUrl: publicEnv.NEXT_PUBLIC_API_URL,
        onUnauthenticated: openSessionExpired,
      }),
    [],
  );
  const [demo, setDemo] = useState<{ client: SpokeClient | null; failedAttempt: number | null }>({
    client: null,
    failedAttempt: null,
  });
  const [demoAttempt, setDemoAttempt] = useState(0);
  const previousMode = useRef<Mode | null>(null);
  const previousPersona = useRef(persona);

  useEffect(() => {
    if (!hydrated) return;
    if (
      previousMode.current !== null &&
      (previousMode.current !== mode || previousPersona.current !== persona)
    )
      queryClient.clear();
    previousMode.current = mode;
    previousPersona.current = persona;
  }, [hydrated, mode, persona, queryClient]);

  useEffect(() => {
    if (!hydrated || mode !== "demo" || demo.client || !loadDemoClient) return;
    let cancelled = false;
    loadDemoClient().then(
      (client) => {
        if (!cancelled) setDemo({ client, failedAttempt: null });
      },
      () => {
        if (!cancelled) setDemo({ client: null, failedAttempt: demoAttempt });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [hydrated, mode, demo.client, demoAttempt, loadDemoClient]);

  const retryDemo = useCallback(() => {
    setDemoAttempt((attempt) => attempt + 1);
  }, []);

  const value = useMemo<ClientContextValue>(() => {
    const demoStatus = demoStatusOf({
      mode,
      ready: demo.client !== null,
      available: loadDemoClient !== undefined,
      failed: demo.failedAttempt === demoAttempt,
    });
    const client = !hydrated ? null : mode === "live" ? live : demo.client;
    return { client, live, mode, demoStatus, retryDemo };
  }, [hydrated, mode, live, demo, demoAttempt, loadDemoClient, retryDemo]);

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export const useClientContext = () => {
  const value = useContext(ClientContext);
  if (!value) throw new Error("useClientContext must be used inside ClientProvider");
  return value;
};

export const useSpokeClient = () => useClientContext().client;

export const useLiveClient = () => useClientContext().live;
