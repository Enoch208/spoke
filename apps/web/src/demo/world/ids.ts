import { getAddress, keccak256, stringToHex, type Address, type Hex } from "viem";
import type { DemoId } from "./types";

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const demoId = (kind: string, n: number | string): DemoId => `demo-${kind}-${String(n)}`;

export const sampleHash = (label: string): Hex => keccak256(stringToHex(`spoke-demo:${label}`));

export const sampleAddress = (label: string): Address => getAddress(sampleHash(label).slice(0, 42));

export const iso = (ms: number): string => new Date(ms).toISOString();

export const isDemoId = (value: string): value is DemoId => value.startsWith("demo-");
