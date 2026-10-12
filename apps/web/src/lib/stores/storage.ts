import { createJSONStorage, type StateStorage } from "zustand/middleware";

type StorageKind = "localStorage" | "sessionStorage";

const resolve = (kind: StorageKind): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window[kind];
  } catch {
    return null;
  }
};

const safeStorage = (kind: StorageKind): StateStorage => ({
  getItem: (name) => {
    try {
      return resolve(kind)?.getItem(name) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      resolve(kind)?.setItem(name, value);
    } catch {
      return;
    }
  },
  removeItem: (name) => {
    try {
      resolve(kind)?.removeItem(name);
    } catch {
      return;
    }
  },
});

export const localJsonStorage = createJSONStorage(() => safeStorage("localStorage"));
export const sessionJsonStorage = createJSONStorage(() => safeStorage("sessionStorage"));

const probeKey = "spoke-storage-probe";

export const isStorageAvailable = (kind: StorageKind = "localStorage") => {
  const storage = resolve(kind);
  if (!storage) return false;
  try {
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
};

const sessionStartKey = "spoke-session-start";

export const browserSessionStart = () => {
  const storage = resolve("sessionStorage");
  try {
    const existing = storage?.getItem(sessionStartKey);
    if (existing) return existing;
    const started = String(Date.now());
    storage?.setItem(sessionStartKey, started);
    return started;
  } catch {
    return "unavailable";
  }
};
