import { queryHook } from "../use-client";

export const useSystemHealth = queryHook("system.health");
export const useSystemStatus = queryHook("system.status");
export const useSystemContracts = queryHook("system.contracts");
export const useSystemEndpoints = queryHook("system.endpoints");
export const useSystemEvents = queryHook("system.events");
