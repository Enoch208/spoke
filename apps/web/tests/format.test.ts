import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatAmountRange,
  formatBlock,
  formatBps,
  formatCountdown,
  formatDateRange,
  formatDateTime,
  formatDuration,
  formatFeeEstimate,
  formatHandle,
  formatHoldPhrase,
  formatMonBalance,
  formatMonFee,
  formatPerson,
  formatRelative,
  formatSignedAmount,
  formatSplit,
  formatTimestampFull,
  numberWord,
  pluralize,
  shortAddress,
  shortHash,
} from "@/lib/format";

const sdusd = { decimals: 6, symbol: "SDUSD" };
const utc = { timeZone: "UTC" };

describe("amounts", () => {
  it("never rounds and keeps every significant decimal", () => {
    expect(formatAmount(4_000_000n, sdusd)).toBe("4.00 SDUSD");
    expect(formatAmount(6_666_666n, sdusd)).toBe("6.666666 SDUSD");
    expect(formatAmount(1_234_500_000n, sdusd)).toBe("1,234.50 SDUSD");
  });

  it("labels the first amount in a view as testnet", () => {
    expect(formatAmount(40_000_000n, sdusd, { testnet: true })).toBe("40.00 SDUSD · testnet");
  });

  it("signs ledger amounts with a true minus", () => {
    expect(formatSignedAmount(-5_000_000n, sdusd)).toBe("−5.00 SDUSD");
    expect(formatSignedAmount(5_000_000n, sdusd)).toBe("+5.00 SDUSD");
    expect(formatSignedAmount(0n, sdusd)).toBe("0.00 SDUSD");
  });

  it("writes ranges with the symbol once", () => {
    expect(formatAmountRange(5_000_000n, 10_000_000n, sdusd)).toBe("5.00–10.00 SDUSD");
  });
});

describe("MON", () => {
  it("truncates balances to four decimals", () => {
    expect(formatMonBalance(50_000_000_000_000_000n)).toBe("0.0500 MON");
    expect(formatMonBalance(99_999_999_999_999n)).toBe("0.0000 MON");
  });

  it("never shows a fee as zero and rounds it up", () => {
    expect(formatMonFee(3_100_000_000_000_000n)).toBe("0.0031 MON");
    expect(formatMonFee(1n)).toBe("0.000000000000000001 MON");
    expect(formatMonFee(2_100_000_400_000_000n)).toBe("0.00210001 MON");
    expect(formatFeeEstimate(2_100_000_000_000_000n)).toBe("about 0.0021 MON");
  });
});

describe("percentages", () => {
  it("shows basis points with up to two decimals", () => {
    expect(formatBps(1000)).toBe("10%");
    expect(formatBps(1050)).toBe("10.5%");
    expect(formatBps(333)).toBe("3.33%");
    expect(formatBps(6667)).toBe("66.67%");
  });

  it("writes splits nearest first without percent signs", () => {
    expect(formatSplit([5000, 2500, 1500, 1000])).toBe("50/25/15/10");
    expect(formatSplit([6667, 3333])).toBe("66.67/33.33");
  });
});

describe("addresses, hashes and people", () => {
  it("truncates checksummed addresses", () => {
    expect(shortAddress("0x6e54a1b2c3d4e5f60718293a4b5c6d7e8f9093f1")).toBe("0x6E54…93F1");
  });

  it("lowercases hashes", () => {
    expect(shortHash(`0x3FA2${"0".repeat(56)}9C01`)).toBe("0x3fa2…9c01");
  });

  it("puts the handle first and never names a private person", () => {
    expect(formatHandle("Mira")).toBe("@mira");
    expect(formatPerson({ handle: "mira", address: "0x1" })).toBe("@mira");
    expect(formatPerson({ isSelf: true, handle: "mira" })).toBe("You");
    expect(formatPerson({})).toBe("Someone");
  });
});

describe("counts", () => {
  it("pluralises exact counts", () => {
    expect(pluralize(1, "sale")).toBe("1 sale");
    expect(pluralize(1204, "sale")).toBe("1,204 sales");
    expect(formatBlock(12_345_678n)).toBe("Block 12,345,678");
    expect(numberWord(4)).toBe("four");
  });
});

describe("dates and times", () => {
  const now = new Date("2026-10-14T08:00:00Z");

  it("drops the year inside the current year", () => {
    expect(formatDateTime(new Date("2026-10-14T09:40:00Z"), { now, ...utc })).toBe("14 Oct, 09:40");
    expect(formatDateTime(new Date("2025-10-14T09:40:00Z"), { now, ...utc })).toBe(
      "14 Oct 2025, 09:40",
    );
  });

  it("shows the full timestamp with offset and UTC", () => {
    expect(
      formatTimestampFull(new Date("2026-10-14T08:40:12Z"), { timeZone: "Africa/Lagos" }),
    ).toBe("14 Oct 2026, 09:40:12 GMT+1 · 2026-10-14T08:40:12Z");
  });

  it("is relative under 24 hours", () => {
    expect(formatRelative(new Date(now.getTime() - 30_000), { now, ...utc })).toBe("just now");
    expect(formatRelative(new Date(now.getTime() - 4 * 60_000), { now, ...utc })).toBe("4 min ago");
    expect(formatRelative(new Date(now.getTime() - 3 * 3_600_000), { now, ...utc })).toBe(
      "3 h ago",
    );
    expect(formatRelative(new Date(now.getTime() + 9 * 60_000), { now, ...utc })).toBe("in 9 min");
    expect(formatRelative(new Date(now.getTime() + 200 * 60_000 + 15_000), { now, ...utc })).toBe(
      "in 3 h 20 min",
    );
    expect(formatRelative(new Date(now.getTime() + 2 * 86_400_000), { now, ...utc })).toBe(
      "16 Oct, 08:00",
    );
  });

  it("uses at most two units for durations", () => {
    expect(formatDuration(60)).toBe("60 s");
    expect(formatDuration(600)).toBe("10 min");
    expect(formatDuration(3600)).toBe("1 h");
    expect(formatDuration(86_400)).toBe("1 day");
    expect(formatDuration(7 * 86_400)).toBe("7 days");
    expect(formatDuration(86_400 + 6 * 3600 + 120)).toBe("1 day 6 h");
    expect(formatCountdown(252)).toBe("4 min 12 s");
  });

  it("names holds as a phrase", () => {
    expect(formatHoldPhrase(600)).toBe("a 10-minute hold");
    expect(formatHoldPhrase(3600)).toBe("a 1-hour hold");
    expect(formatHoldPhrase(8 * 3600)).toBe("an 8-hour hold");
    expect(formatHoldPhrase(7 * 86_400)).toBe("a 7-day hold");
  });

  it("writes date ranges with en dashes", () => {
    expect(
      formatDateRange(new Date("2026-10-01T12:00:00Z"), new Date("2026-10-14T12:00:00Z"), utc),
    ).toBe("1–14 Oct 2026");
    expect(
      formatDateRange(new Date("2026-09-28T12:00:00Z"), new Date("2026-10-04T12:00:00Z"), utc),
    ).toBe("28 Sep – 4 Oct 2026");
  });
});
