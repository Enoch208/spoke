import { mutationHook, queryHook } from "../use-client";

export const useWebhooksList = queryHook("webhooks.list");
export const useWebhooksCreateMutation = mutationHook("webhooks.create", ["webhooks"]);
export const useWebhooksTestMutation = mutationHook("webhooks.test", ["webhooks"]);
export const useWebhooksDeliveries = queryHook("webhooks.deliveries");
export const useWebhooksUpdateMutation = mutationHook("webhooks.update", ["webhooks"]);
export const useWebhooksRotateSecretMutation = mutationHook("webhooks.rotateSecret", ["webhooks"]);
export const useWebhooksRemoveMutation = mutationHook("webhooks.remove", ["webhooks"]);
export const useWebhooksReplayMutation = mutationHook("webhooks.replay", ["webhooks"]);
