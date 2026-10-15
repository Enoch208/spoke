import { clientMethodSchemas, type ClientMethod, type ErrorCode } from "@spoke/protocol";
import { ClientError } from "../../src/lib/client/errors";
import { describe, expect, it } from "vitest";
import { coreSetups } from "./inputs-core";
import { createDemoTestClient } from "./harness";
import { methodInputs, methodPersonas } from "./inputs";
import type { MethodSetups } from "./inputs-types";

const methods = Object.keys(clientMethodSchemas).filter((name): name is ClientMethod =>
  Object.hasOwn(clientMethodSchemas, name),
);

const setups: MethodSetups = { ...coreSetups };

const refusals: Partial<Record<ClientMethod, ErrorCode>> = {
  "account.deleteAccount": "NOT_AUTHORIZED",
  "workspace.save": "FEATURE_NOT_AVAILABLE",
  "funding.auroraPreview": "FEATURE_NOT_AVAILABLE",
  "funding.auroraCreateDeposit": "FEATURE_NOT_AVAILABLE",
  "funding.auroraDeposit": "FEATURE_NOT_AVAILABLE",
};

const callAny = async (method: ClientMethod, input: unknown) => {
  const { client } = createDemoTestClient({ persona: methodPersonas[method] ?? "merchant" });
  await setups[method]?.(client);
  const call: unknown = client[method];
  if (typeof call !== "function") throw new TypeError(`${method} is not callable.`);
  const result: unknown = await Reflect.apply(call, client, [input]);
  return result;
};

describe("every demo client method answers with its protocol output shape", () => {
  it("has an input fixture for every client method", () => {
    expect(methods.filter((method) => !(method in methodInputs))).toEqual([]);
  });

  it.each([
    "funding.auroraPreview",
    "funding.auroraCreateDeposit",
    "funding.auroraDeposit",
  ] as const)("never creates real mainnet funding instructions in Demo: %s", async (method) => {
    await expect(callAny(method, methodInputs[method])).rejects.toMatchObject({
      code: "FEATURE_NOT_AVAILABLE",
    });
  });

  it("refuses to delete a demo account and points to Reset demo", async () => {
    const refusal = await callAny(
      "account.deleteAccount",
      methodInputs["account.deleteAccount"],
    ).catch((error: unknown) => error);
    expect(refusal).toBeInstanceOf(ClientError);
    expect(refusal instanceof ClientError ? [refusal.code, refusal.message] : null).toEqual([
      "NOT_AUTHORIZED",
      "Demo accounts can't be deleted. Use Reset demo.",
    ]);
  });

  it.each(methods.filter((method) => !(method in refusals)))("%s", async (method) => {
    const fixture = methodInputs[method];
    expect(fixture).toBeDefined();
    const output = await callAny(method, fixture);
    const parsed = clientMethodSchemas[method].output.safeParse(output);
    expect(parsed.success ? null : parsed.error.issues).toBeNull();
  });
});
