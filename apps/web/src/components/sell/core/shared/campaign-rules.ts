import type { ClientOutput } from "@spoke/protocol";
import type { CampaignStateKey } from "@/lib/copy";

export type MerchantCampaignRow = ClientOutput<"campaigns.mine">["items"][number];

const running = new Set<CampaignStateKey>(["live", "exhausted"]);
const closed = new Set<CampaignStateKey>(["ended", "expired"]);
const withdrawable = new Set<CampaignStateKey>(["paused", "ended", "expired"]);
const unlaunched = new Set<CampaignStateKey>(["draft", "notFunded", "notLiveYet"]);

export const isRunning = (key: CampaignStateKey) => running.has(key);
export const isClosed = (key: CampaignStateKey) => closed.has(key);
export const isUnlaunched = (key: CampaignStateKey) => unlaunched.has(key);
export const canTopUp = (key: CampaignStateKey) => !closed.has(key) && key !== "draft";
export const canWithdraw = (key: CampaignStateKey, available: bigint) =>
  withdrawable.has(key) && available > 0n;
export const canPause = (key: CampaignStateKey) => running.has(key);
export const canResume = (key: CampaignStateKey) => key === "paused";
export const canEnd = (key: CampaignStateKey) =>
  !closed.has(key) && key !== "draft" && key !== "hidden";
