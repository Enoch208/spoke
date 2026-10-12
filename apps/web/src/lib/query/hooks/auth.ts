import { mutationHook } from "../use-client";

export const useAuthChallengeMutation = mutationHook("auth.challenge", []);
export const useAuthVerifyMutation = mutationHook("auth.verify", []);
export const useAuthSignOutMutation = mutationHook("auth.signOut", []);
