import { create } from "zustand";
import { fill } from "@/lib/copy";
import { capabilityCopy, growthCopy, roleCopy } from "./copy";

export const roles = ["owner", "admin", "finance", "developer", "analyst", "support"] as const;
export type Role = (typeof roles)[number];

export type Access = "yes" | "signs" | "prepares" | "no";

export const capabilities = [
  "view",
  "invite",
  "export",
  "integrations",
  "developer",
  "respond",
  "refund",
  "team",
  "billing",
  "settings",
  "danger",
] as const;
export type Capability = (typeof capabilities)[number];

const row = (
  owner: Access,
  admin: Access,
  finance: Access,
  developer: Access,
  analyst: Access,
  support: Access,
): Readonly<Record<Role, Access>> => ({ owner, admin, finance, developer, analyst, support });

export const permissionMatrix: Readonly<Record<Capability, Readonly<Record<Role, Access>>>> = {
  view: row("yes", "yes", "yes", "yes", "yes", "yes"),
  invite: row("yes", "yes", "no", "no", "no", "no"),
  export: row("yes", "yes", "yes", "yes", "yes", "no"),
  integrations: row("signs", "prepares", "no", "prepares", "no", "no"),
  developer: row("yes", "yes", "no", "yes", "no", "no"),
  respond: row("yes", "yes", "no", "no", "no", "yes"),
  refund: row("signs", "prepares", "prepares", "no", "no", "prepares"),
  team: row("yes", "yes", "no", "no", "no", "no"),
  billing: row("yes", "yes", "yes", "no", "no", "no"),
  settings: row("yes", "yes", "no", "no", "no", "no"),
  danger: row("yes", "no", "no", "no", "no", "no"),
};

export const accessOf = (capability: Capability, role: Role): Access =>
  permissionMatrix[capability][role];

export const allows = (capability: Capability, role: Role) => accessOf(capability, role) !== "no";

export const noPermissionText = (capability: Capability, role: Role) =>
  fill(growthCopy.noPermission, {
    role: roleCopy[role],
    action: capabilityCopy[capability].action,
  });

type ViewAsState = {
  role: Role | null;
  setRole: (role: Role | null) => void;
};

export const useViewAsStore = create<ViewAsState>()((set) => ({
  role: null,
  setRole: (role) => {
    set({ role });
  },
}));
