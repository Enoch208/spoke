import { addressString, isSupportedChainId } from "@spoke/protocol";
import { getAddress } from "viem";
import { z } from "zod";

const optionalAddress = z
  .union([addressString, z.literal("")])
  .optional()
  .transform((value) => (value ? getAddress(value) : null));

const publicEnvSchema = z.object({
  NEXT_PUBLIC_CHAIN_ID: z.coerce
    .number()
    .int()
    .refine(isSupportedChainId, "NEXT_PUBLIC_CHAIN_ID must be 10143 or 31337"),
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_PROTOCOL_ADDRESS: optionalAddress,
  NEXT_PUBLIC_DEMO_TOKEN_ADDRESS: optionalAddress,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export const parsePublicEnv = (source: Record<string, string | undefined>): PublicEnv =>
  publicEnvSchema.parse(source);
