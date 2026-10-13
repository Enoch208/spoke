import { addressString, isSupportedChainId } from "@spoke/protocol";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(8740),
  HOST: z.string().min(1).default("127.0.0.1"),
  WEB_ORIGIN: z.url(),
  API_ORIGIN: z.url().optional(),
  STORAGE_DIRECTORY: z.string().min(1).optional(),
  GAS_STATION_PRIVATE_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .regex(/^0x[\da-fA-F]{64}$/)
      .optional(),
  ),
  NANSEN_API_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  NANSEN_CREDIT_BUDGET: z.coerce.number().int().min(0).max(100).default(50),
  AURORA_APP_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).max(256).optional(),
  ),
  AURORA_MONAD_RPC_URL: z
    .url()
    .refine((value) => new URL(value).protocol === "https:")
    .default("https://rpc.monad.xyz"),
  NANSEN_REFRESH_ON_START: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  INDEXER_SOURCE: z.enum(["direct_rpc", "envio"]).default("direct_rpc"),
  CHAIN_ID: z.coerce.number().int().refine(isSupportedChainId, "CHAIN_ID must be 10143 or 31337"),
  RPC_URL: z.url(),
  RPC_REQUESTS_PER_SECOND: z.coerce.number().int().min(1).max(50).default(5),
  DATABASE_URL: z
    .url()
    .refine((url) => ["postgres:", "postgresql:"].includes(new URL(url).protocol)),
  NODE_ENV: z.enum(["production", "development", "test"]).default("development"),
  DEPLOYMENT_BLOCK: z.string().regex(/^\d+$/).default("0"),
  OPERATOR_ADDRESSES: z
    .string()
    .default("")
    .transform((value) =>
      value
        ? value.split(",").map((address) => addressString.parse(address.trim()).toLowerCase())
        : [],
    ),
  TOKEN_ADDRESS: z
    .union([addressString, z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .default(""),
  PROTOCOL_ADDRESS: z
    .union([addressString, z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .default(""),
});

export type Env = z.infer<typeof envSchema>;

export const parseEnv = (source: NodeJS.ProcessEnv): Env => envSchema.parse(source);
