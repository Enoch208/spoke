import { z } from "zod";
import { errorCodes } from "../errors";
import { subsystemHealth } from "../status";

export const addressString = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Expected a 20-byte address");
export const bytes32String = z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Expected 32 bytes of hex");
export const txHashString = bytes32String;
export const uintString = z
  .string()
  .max(78)
  .regex(/^(0|[1-9]\d*)$/, "Expected a canonical unsigned integer string")
  .pipe(z.string().refine((value) => BigInt(value) < 2n ** 256n, "Integer exceeds uint256"));
export const isoTimestamp = z.iso.datetime({ offset: false });

export const envelope = <T extends z.ZodType>(data: T) =>
  z.object({
    requestId: z.string(),
    timestamp: isoTimestamp,
    schemaVersion: z.string().optional(),
    chainId: z.number().int().nullable().optional(),
    contractAddress: addressString.nullable().optional(),
    blockNumber: uintString.nullable().optional(),
    indexingStatus: z.enum(["live", "syncing", "behind"]).optional(),
    data,
  });

export const apiError = z.object({
  error: z.object({
    code: z.enum(errorCodes),
    message: z.string(),
    retryable: z.boolean(),
    requestId: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof apiError>;

export const health = z.object({
  api: z.enum(subsystemHealth),
  database: z.enum(subsystemHealth),
  rpc: z.enum(subsystemHealth),
  indexer: z.object({
    status: z.enum(subsystemHealth),
    lastBlock: uintString.nullable(),
    lagSeconds: z.number().nonnegative().nullable(),
  }),
  chainHead: uintString.nullable(),
  chainId: z.number().int(),
  protocolAddress: addressString.nullable(),
});
export type Health = z.infer<typeof health>;
