import { mutationHook, queryHook } from "../use-client";

export const useSubscriptionsList = queryHook("subscriptions.list");
export const useSubscriptionsGet = queryHook("subscriptions.get");
export const useSubscriptionsSaveMutation = mutationHook("subscriptions.save", ["subscriptions"]);
