import { mutationHook, queryHook } from "../use-client";

export const useLinksMine = queryHook("links.mine");
export const useLinksGet = queryHook("links.get");
export const useLinksResolveCode = queryHook("links.resolveCode");
export const useLinksRecordOpenMutation = mutationHook("links.recordOpen", []);
export const useLinksPreviewJoin = queryHook("links.previewJoin");
export const useLinksStats = queryHook("links.stats");
