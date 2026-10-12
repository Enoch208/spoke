import { computeReward, formatTokenAmount } from "@spoke/protocol";
import { HOUR, iso } from "./ids";
import { policyAt } from "./sale-math";
import type { DemoCampaign, DemoCore, TokenKey } from "./types";
import type { DeviceSession, Notification } from "./world";

export type NoticeCategory =
  "earnings" | "network" | "invitations" | "purchases" | "campaigns" | "business" | "account";

export interface NoticeBody {
  kind: `${string}.${string}`;
  category: NoticeCategory;
  workspace: Notification["workspace"];
  title: string;
  body: string;
  href: string;
  amount?: bigint;
}

export interface NoticeSpec extends NoticeBody {
  at: number;
}

const stamp = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

export const when = (ms: number): string => `${stamp.format(ms)} UTC`;

export const tokenText = (core: DemoCore, amount: bigint, key: TokenKey): string =>
  `${formatTokenAmount(amount, core.tokens[key].decimals)} ${core.tokens[key].symbol}`;

export const monText = (wei: bigint): string => `${formatTokenAmount(wei, 18)} MON`;

export const sdusdOnly = (key: TokenKey, amount: bigint): { amount?: bigint } =>
  key === "sdusd" ? { amount } : {};

export const productTitle = (core: DemoCore, campaign: DemoCampaign): string =>
  core.products.find((product) => product.id === campaign.productId)?.title ?? "A sample product";

export const availableOf = (core: DemoCore, campaign: DemoCampaign): bigint => {
  const funded = core.fundings
    .filter((funding) => funding.campaignId === campaign.id)
    .reduce(
      (total, funding) => total + (funding.kind === "deposited" ? funding.amount : -funding.amount),
      0n,
    );
  const committed = core.sales
    .filter((sale) => sale.campaignId === campaign.id && sale.status !== "REFUNDED")
    .flatMap((sale) => sale.allocations)
    .reduce((total, allocation) => total + allocation.amount, 0n);
  return funded - committed;
};

export const perSaleOf = (core: DemoCore, campaign: DemoCampaign, at: number): bigint => {
  const policy = policyAt(campaign, at).policy;
  const price = core.products.find((product) => product.id === campaign.productId)?.price ?? 0n;
  return computeReward(price, policy.commissionBps, BigInt(policy.perSaleCap));
};

const methodWords: Record<DeviceSession["method"], string> = {
  passkey: "your passkey",
  wallet: "your wallet",
  phrase: "your recovery phrase",
};

const accountNotice = (
  kind: NoticeBody["kind"],
  title: string,
  body: string,
  href: string,
): NoticeBody => ({
  kind,
  category: "account",
  workspace: "account",
  title,
  body,
  href,
});

export const signInNotice = (session: DeviceSession): NoticeBody =>
  accountNotice(
    "account.signIn",
    "New sign-in",
    `Signed in on ${session.deviceLabel} with ${methodWords[session.method]}. Not you? Sign that device out in Security.`,
    "/settings/security",
  );

export const passkeyNotice = (label: string, change: "added" | "removed", at: number): NoticeBody =>
  accountNotice(
    "account.passkey",
    change === "added" ? "Passkey added" : "Passkey removed",
    `${label} was ${change} ${when(at)}.`,
    "/settings/security",
  );

export const walletNotice = (address: string, change: "linked" | "unlinked"): NoticeBody =>
  accountNotice(
    "account.wallet",
    change === "linked" ? "Wallet linked" : "Wallet unlinked",
    `${address} was ${change === "linked" ? "linked to" : "unlinked from"} your account.`,
    "/settings/wallets",
  );

export const payoutNotice = (address: string): NoticeBody =>
  accountNotice(
    "account.payout",
    "Payout address changed",
    `New links will pay ${address}. Links you already made are unchanged.`,
    "/settings/wallets",
  );

export const gasNotice = (wei: bigint): NoticeBody =>
  accountNotice(
    "account.gas",
    "Test MON arrived",
    `${monText(wei)} · testnet from the Spoke gas station.`,
    "/wallet",
  );

export const exportNotice = (expiresAt: number): NoticeBody =>
  accountNotice(
    "export.ready",
    "Your export is ready",
    `Your Spoke data export is ready to download until ${when(expiresAt)}.`,
    "/settings/privacy",
  );

export const toNotification = (
  id: string,
  spec: NoticeSpec,
  readAt: number | null,
): Notification => ({
  id,
  kind: spec.kind,
  category: spec.category,
  title: spec.title,
  body: spec.body,
  ...(spec.amount === undefined ? {} : { amount: spec.amount.toString() }),
  href: spec.href,
  workspace: spec.workspace,
  readAt: readAt === null ? null : iso(readAt),
  createdAt: iso(spec.at),
});

export const seededReadAt = (at: number, anchor: number, unreadWindow: number): number | null =>
  at >= anchor - unreadWindow ? null : Math.min(at + HOUR, anchor);
