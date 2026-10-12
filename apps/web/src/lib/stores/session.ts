import { create } from "zustand";

export const sessionStatuses = [
  "anonymous",
  "connecting",
  "signing",
  "signedIn",
  "expired",
] as const;
export type SessionStatus = (typeof sessionStatuses)[number];

export const accountKinds = ["passkey", "wallet"] as const;
export type AccountKind = (typeof accountKinds)[number];

export type SignedInAccount = {
  address: `0x${string}`;
  accountKind: AccountKind;
  sessionExpiresAt: string;
  isMerchant: boolean;
  isOperator: boolean;
};

type SessionState = {
  status: SessionStatus;
  address: `0x${string}` | null;
  accountKind: AccountKind | null;
  sessionExpiresAt: string | null;
  isMerchant: boolean;
  isOperator: boolean;
  setStatus: (status: SessionStatus) => void;
  signIn: (account: SignedInAccount) => void;
  updateRoles: (roles: Pick<SignedInAccount, "isMerchant" | "isOperator">) => void;
  expire: () => void;
  signOut: () => void;
};

const anonymous = {
  status: "anonymous",
  address: null,
  accountKind: null,
  sessionExpiresAt: null,
  isMerchant: false,
  isOperator: false,
} as const;

export const useSessionStore = create<SessionState>()((set) => ({
  ...anonymous,
  setStatus: (status) => {
    set({ status });
  },
  signIn: (account) => {
    set({ ...account, status: "signedIn" });
  },
  updateRoles: (roles) => {
    set(roles);
  },
  expire: () => {
    set((state) => (state.status === "signedIn" ? { status: "expired" } : state));
  },
  signOut: () => {
    set(anonymous);
  },
}));

export const selectIsSignedIn = (state: SessionState) => state.status === "signedIn";
