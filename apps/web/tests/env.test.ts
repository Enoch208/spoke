import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "../src/lib/env";

describe("parsePublicEnv", () => {
  it("treats unset contract addresses as not deployed", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_CHAIN_ID: "31337",
      NEXT_PUBLIC_API_URL: "http://localhost:8740",
      NEXT_PUBLIC_PROTOCOL_ADDRESS: "",
    });
    expect(env.NEXT_PUBLIC_PROTOCOL_ADDRESS).toBeNull();
    expect(env.NEXT_PUBLIC_DEMO_TOKEN_ADDRESS).toBeNull();
  });

  it("refuses a chain Spoke does not support", () => {
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_CHAIN_ID: "1", NEXT_PUBLIC_API_URL: "http://localhost:8740" }),
    ).toThrow();
  });
});
