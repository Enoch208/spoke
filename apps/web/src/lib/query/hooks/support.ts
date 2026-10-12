import { mutationHook, queryHook } from "../use-client";

export const useSupportReportMutation = mutationHook("support.report", []);
export const useSupportContactMutation = mutationHook("support.contact", []);
export const useSupportMine = queryHook("support.mine");
