import { mutationHook, queryHook } from "../use-client";

export const useCampaignsList = queryHook("campaigns.list");
export const useCampaignsGet = queryHook("campaigns.get");
export const useCampaignsPolicy = queryHook("campaigns.policy");
export const useCampaignsStats = queryHook("campaigns.stats");
export const useCampaignsActivity = queryHook("campaigns.activity");
export const useCampaignsMine = queryHook("campaigns.mine");
export const useCampaignsSaveDraftMutation = mutationHook("campaigns.saveDraft", ["campaigns"]);
export const useCampaignsGetDraft = queryHook("campaigns.getDraft");
export const useCampaignsDeleteDraftMutation = mutationHook("campaigns.deleteDraft", ["campaigns"]);
export const useCampaignsPrepareCreateMutation = mutationHook("campaigns.prepareCreate", []);
export const useCampaignsUpdateSettingsMutation = mutationHook("campaigns.updateSettings", [
  "campaigns",
  "vault",
]);
export const useCampaignsDistributors = queryHook("campaigns.distributors");
