import { mutationHook, queryHook } from "../use-client";

export const useSignersList = queryHook("signers.list");
export const useSignersAddMutation = mutationHook("signers.add", ["signers"]);
export const useSignersRevokeMutation = mutationHook("signers.revoke", ["signers"]);
export const useSignersAttestations = queryHook("signers.attestations");
