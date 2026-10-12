import { z } from "zod";

export const DEMO_SNAPSHOT_VERSION = 1;

export const personas = ["merchant", "distributor", "buyer"] as const;

export const journalEntry = z.object({
  kind: z.enum(["client", "chain"]),
  name: z.string().min(3).max(80),
  input: z.json(),
  at: z.number().int().nonnegative(),
  persona: z.enum(personas),
});
export type JournalEntry = z.infer<typeof journalEntry>;

export const demoSnapshot = z.object({
  version: z.literal(DEMO_SNAPSHOT_VERSION),
  anchor: z.number().int().positive(),
  clockOffsetMs: z.number().int().nonnegative(),
  persona: z.enum(personas),
  journal: z.array(journalEntry).max(5000),
});
export type DemoSnapshot = z.infer<typeof demoSnapshot>;

export const freshSnapshot = (anchor: number, persona: DemoSnapshot["persona"]): DemoSnapshot => ({
  version: DEMO_SNAPSHOT_VERSION,
  anchor,
  clockOffsetMs: 0,
  persona,
  journal: [],
});

export const readSnapshot = (value: unknown): DemoSnapshot | null => {
  const parsed = demoSnapshot.safeParse(value);
  return parsed.success ? parsed.data : null;
};
