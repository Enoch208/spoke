import { addressString, isSupportedChainId } from "@spoke/protocol";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(8740),
  HOST: z.string().min(1).default("127.0.0.1"),
  WEB_ORIGIN: z.url(),
  CHAIN_ID: z.coerce.number().int().refine(isSupportedChainId, "CHAIN_ID must be 10143 or 31337"),
  RPC_URL: z.url(),
  PROTOCOL_ADDRESS: z
    .union([addressString, z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .default(""),
});

export type Env = z.infer<typeof envSchema>;

export const parseEnv = (source: NodeJS.ProcessEnv): Env => envSchema.parse(source);
