import { mutationHook, queryHook } from "../use-client";

export const useStudioTemplates = queryHook("studio.templates");
export const useStudioSaveTemplateMutation = mutationHook("studio.saveTemplate", ["studio"]);
export const useStudioSimulate = queryHook("studio.simulate");
