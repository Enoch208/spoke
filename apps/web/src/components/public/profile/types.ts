import type { ClientOutput } from "@spoke/protocol";
import { formatHandle } from "@/lib/format";

export type AnyProfile = Exclude<ClientOutput<"reputation.get">, { hidden: true }>;

export const methodologyLabel = (version: string) => version.replace(/^reputation-/, "");

export const profileName = (profile: AnyProfile) =>
  profile.displayName ?? (profile.handle ? formatHandle(profile.handle) : null);
