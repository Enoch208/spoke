import { mutationHook, queryHook } from "../use-client";

export const useFundingStatus = queryHook("funding.status");
export const useFundingRequestGasMutation = mutationHook("funding.requestGas", [
  "funding",
  "account",
]);
