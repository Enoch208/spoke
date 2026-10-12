import { mutationHook, queryHook } from "../use-client";

export const useGraphForCampaign = queryHook("graph.forCampaign");
export const useGraphMine = queryHook("graph.mine");
export const useGraphAncestry = queryHook("graph.ancestry");
export const useGraphSalePath = queryHook("graph.salePath");
export const useGraphSearch = queryHook("graph.search");
export const useGraphExportMutation = mutationHook("graph.export", []);
