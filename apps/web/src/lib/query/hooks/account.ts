import { mutationHook, queryHook } from "../use-client";

export const useAccountMe = queryHook("account.me");
export const useAccountUpdateProfileMutation = mutationHook("account.updateProfile", [
  "account",
  "reputation",
]);
export const useAccountHandleAvailable = queryHook("account.handleAvailable");
export const useAccountActivity = queryHook("account.activity");
export const useAccountBalances = queryHook("account.balances");
export const useAccountRecordRecoveryCheckMutation = mutationHook("account.recordRecoveryCheck", [
  "account",
]);
export const useAccountPasskeys = queryHook("account.passkeys");
export const useAccountAddPasskeyMutation = mutationHook("account.addPasskey", ["account"]);
export const useAccountUpdatePasskeyMutation = mutationHook("account.updatePasskey", ["account"]);
export const useAccountRemovePasskeyMutation = mutationHook("account.removePasskey", ["account"]);
export const useAccountPasskeyVault = queryHook("account.passkeyVault");
export const useAccountWallets = queryHook("account.wallets");
export const useAccountLinkWalletMutation = mutationHook("account.linkWallet", ["account"]);
export const useAccountUnlinkWalletMutation = mutationHook("account.unlinkWallet", ["account"]);
export const useAccountLabelWalletMutation = mutationHook("account.labelWallet", ["account"]);
export const useAccountSetPayoutAddressMutation = mutationHook("account.setPayoutAddress", [
  "account",
  "links",
]);
export const useAccountSessions = queryHook("account.sessions");
export const useAccountRevokeSessionMutation = mutationHook("account.revokeSession", ["account"]);
export const useAccountPreferences = queryHook("account.preferences");
export const useAccountUpdatePreferencesMutation = mutationHook("account.updatePreferences", [
  "account",
]);
export const useAccountExportDataMutation = mutationHook("account.exportData", []);
export const useAccountDeleteAccountMutation = mutationHook("account.deleteAccount", ["account"]);
