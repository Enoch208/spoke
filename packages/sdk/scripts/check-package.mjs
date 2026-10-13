import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const consumer = mkdtempSync(join(tmpdir(), "spoke-sdk-consumer-"));
const run = (command, args, cwd = consumer) =>
  execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });

try {
  const packed = JSON.parse(
    run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", consumer], packageRoot),
  )[0];
  assert.equal(packed.name, "@enochid/spoke-sdk");
  assert.equal(
    packed.version,
    JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")).version,
  );
  for (const file of packed.files) {
    assert.match(file.path, /^(dist\/[^/]+|package\.json|README\.md|CHANGELOG\.md|LICENSE)$/);
  }
  for (const file of [
    "dist/index.js",
    "dist/index.cjs",
    "dist/index.d.ts",
    "dist/index.d.cts",
    "LICENSE",
  ]) {
    assert.ok(
      packed.files.some((entry) => entry.path === file),
      `Missing ${file}`,
    );
  }
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
  run("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--package-lock=false",
    join(consumer, packed.filename),
  ]);
  const installed = JSON.parse(
    readFileSync(join(consumer, "node_modules/@enochid/spoke-sdk/package.json"), "utf8"),
  );
  assert.ok(!installed.private);
  for (const [name, version] of Object.entries(installed.dependencies ?? {})) {
    assert.notEqual(name, "@spoke/protocol");
    assert.ok(!version.startsWith("workspace:"));
  }
  const exercise = `
const assert = require("node:assert/strict");
assert.equal(publicReadMethods.length, 32);
const client = createSpokeClient({
  baseUrl: "https://api.usespoke.xyz",
  fetch: async (url, options) => {
    assert.equal(url.pathname, "/v1/system/contracts");
    assert.equal(options.credentials, "omit");
    return Response.json({ requestId: "req_package", timestamp: "2026-10-13T00:00:00.000Z", chainId: 10143, blockNumber: "1", indexingStatus: "live", data: { contracts: [] } });
  }
});
(async () => {
  assert.deepEqual(await client.read("system.contracts", {}), { contracts: [] });
  assert.equal((await client.readEnvelope("system.contracts", {})).requestId, "req_package");
  await assert.rejects(client.read("auth.verify", {}), TypeError);
})().catch((error) => { process.stderr.write(String(error)); process.exitCode = 1; });
`;
  writeFileSync(
    join(consumer, "smoke.cjs"),
    `const { createSpokeClient, publicReadMethods } = require("@enochid/spoke-sdk");${exercise}`,
  );
  writeFileSync(
    join(consumer, "smoke.mjs"),
    `import { createRequire } from "node:module";
import { createSpokeClient, publicReadMethods } from "@enochid/spoke-sdk";
const require = createRequire(import.meta.url);${exercise}`,
  );
  run(process.execPath, ["smoke.mjs"]);
  run(process.execPath, ["smoke.cjs"]);
  const types = `import { createSpokeClient, type SpokeReadInput, type SpokeReadOutput, type PublicReadMethod } from "@enochid/spoke-sdk";
const method: PublicReadMethod = "system.contracts";
const input: SpokeReadInput<typeof method> = {};
const result: Promise<SpokeReadOutput<typeof method>> = createSpokeClient({ baseUrl: "https://api.usespoke.xyz" }).read(method, input);
void result;
`;
  writeFileSync(join(consumer, "consumer.mts"), types);
  writeFileSync(join(consumer, "consumer.cts"), types);
  run(process.execPath, [
    resolve(packageRoot, "../../node_modules/typescript/bin/tsc"),
    "--noEmit",
    "--strict",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--target",
    "ES2022",
    "--lib",
    "ES2022,DOM",
    "consumer.mts",
    "consumer.cts",
  ]);
  process.stdout.write(
    `Verified ${packed.name}@${packed.version}: clean install, ESM, CommonJS, declarations and ${packed.files.length} publishable files.\n`,
  );
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
