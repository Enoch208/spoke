import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const abiDir = join(packageRoot, "..", "protocol", "src", "abi");

const exportsToWrite = [
  {
    artifact: "ISpokeProtocol.sol/ISpokeProtocol.json",
    file: "spoke-protocol.ts",
    name: "spokeProtocolAbi",
  },
  { artifact: "ISpokeDemoUSD.sol/ISpokeDemoUSD.json", file: "demo-token.ts", name: "demoTokenAbi" },
] as const;

const readAbi = async (artifact: string): Promise<unknown> => {
  const raw: unknown = JSON.parse(await readFile(join(packageRoot, "out", artifact), "utf8"));
  if (typeof raw !== "object" || raw === null || !("abi" in raw) || !Array.isArray(raw.abi)) {
    throw new TypeError(`No abi array in ${artifact}`);
  }
  return raw.abi;
};

await mkdir(abiDir, { recursive: true });

for (const entry of exportsToWrite) {
  const abi = await readAbi(entry.artifact);
  await writeFile(
    join(abiDir, entry.file),
    `export const ${entry.name} = ${JSON.stringify(abi, null, 2)} as const;\n`,
  );
}

await writeFile(
  join(abiDir, "index.ts"),
  exportsToWrite
    .map((entry) => `export { ${entry.name} } from "./${entry.file.replace(".ts", "")}";`)
    .join("\n") + "\n",
);

process.stdout.write(`Wrote ${String(exportsToWrite.length)} ABIs to ${abiDir}\n`);
