import type { PartialHandlers } from "../handler";
import { activityReads } from "./account-activity";
import { keyReads, keyWrites } from "./account-keys";
import { profileReads, profileWrites } from "./account-profile";
import { settingsReads, settingsWrites } from "./account-settings";
import { walletReads, walletWrites } from "./account-wallets";

export const accountReads = {
  ...profileReads,
  ...activityReads,
  ...keyReads,
  ...walletReads,
  ...settingsReads,
} satisfies PartialHandlers<"account">;

export const accountWrites = {
  ...profileWrites,
  ...keyWrites,
  ...walletWrites,
  ...settingsWrites,
} satisfies PartialHandlers<"account">;
