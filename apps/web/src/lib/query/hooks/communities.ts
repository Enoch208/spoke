import { mutationHook, queryHook } from "../use-client";

export const useCommunitiesList = queryHook("communities.list");
export const useCommunitiesGet = queryHook("communities.get");
export const useCommunitiesCreateMutation = mutationHook("communities.create", ["communities"]);
export const useCommunitiesMembers = queryHook("communities.members");
export const useCommunitiesJoinMutation = mutationHook("communities.join", [
  "communities",
  "links",
]);
export const useCommunitiesLeaveMutation = mutationHook("communities.leave", ["communities"]);
export const useCommunitiesUpdateMutation = mutationHook("communities.update", ["communities"]);
