import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const outputArgument = process.argv[2];
if (!outputArgument) throw new Error("Provide an output path outside the repository.");
const output = resolve(outputArgument);
const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fromRepository = relative(repository, output);
if (!isAbsolute(fromRepository) && !fromRepository.startsWith(`..${sep}`))
  throw new Error("Store fixture keys outside the repository.");

const order = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const generated = new Set<string>();
const key = (): string => {
  for (;;) {
    const candidate = `0x${randomBytes(32).toString("hex")}`;
    const value = BigInt(candidate);
    if (value > 0n && value < order && !generated.has(candidate)) {
      generated.add(candidate);
      return candidate;
    }
  }
};
const names = [
  "MERCHANT_A",
  "MERCHANT_B",
  "A",
  "B",
  "C",
  "D",
  "BRANCH",
  "BUYER_A",
  "BUYER_B",
  "REFUND_BUYER",
] as const;
const content = names.map((name) => `FIXTURE_${name}_KEY=${key()}`).join("\n") + "\n";
await writeFile(output, content, { mode: 0o600, flag: "wx" });
process.stdout.write(`Wrote ten testnet fixture keys to ${output}.\n`);
