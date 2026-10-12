import { mutationHook, queryHook } from "../use-client";

export const useReportsExportMutation = mutationHook("reports.export", []);
export const useReportsPreview = queryHook("reports.preview");
export const useReportsList = queryHook("reports.list");
