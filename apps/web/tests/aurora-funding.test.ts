import { describe, expect, it } from "vitest";
import { fundingInput, fundingPollInterval } from "../src/components/account/aurora-model";

const source = {
  assetId: "sample-base-usdc",
  blockchain: "base",
  chainId: 8453,
  networkName: "Base",
  symbol: "USDC",
  decimals: 6,
  contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};
const refund = "0x0000000000000000000000000000000000000062";

describe("mainnet funding amount entry", () => {
  it("preserves exact base units and refuses rounding, scientific notation, zero and overflow", () => {
    expect(fundingInput(source, "sample-monad-usdc", "12.345678", refund, 50)?.amount).toBe(
      "12345678",
    );
    for (const amount of ["12.3456789", "1e6", "0", "-1", "abc", "9".repeat(117)])
      expect(fundingInput(source, "sample-monad-usdc", amount, refund, 50)).toBeNull();
    expect(fundingInput(source, "sample-monad-usdc", "1", "not-an-address", 50)).toBeNull();
    expect(fundingInput(source, "sample-monad-usdc", "1", `0x${"0".repeat(40)}`, 50)).toBeNull();
    expect(fundingPollInterval(undefined, Date.now())).toBe(5000);
  });
});
