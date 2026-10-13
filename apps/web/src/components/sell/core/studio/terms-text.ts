import { fill } from "@/lib/copy";
import { formatBps, formatSplit } from "@/lib/format";
import { holdSecondsOf, parsePercent, parsedBps, type StudioTerms } from "./terms";

const units = [
  { seconds: 86_400, name: "day" },
  { seconds: 3_600, name: "hour" },
  { seconds: 60, name: "minute" },
] as const;

const unitOf = (seconds: number) =>
  units.find((candidate) => seconds % candidate.seconds === 0) ?? units[2];

export const holdAdjective = (seconds: number) => {
  const unit = unitOf(seconds);
  return `${String(Math.max(1, Math.floor(seconds / unit.seconds)))}-${unit.name}`;
};

export const holdWords = (seconds: number) => {
  const unit = unitOf(seconds);
  const value = Math.max(1, Math.floor(seconds / unit.seconds));
  return `${String(value)} ${unit.name}${value === 1 ? "" : "s"}`;
};

const chipCopy = {
  levels: "{count} levels",
  level: "1 level",
  renormalize: "Renormalize",
  returnUnused: "Return unused",
  hold: "{hold} hold",
  change: "{field} {before} → {after}",
  fields: {
    rate: "Commission",
    levels: "People paid",
    split: "Split",
    shortPath: "Short paths",
    hold: "Hold",
  },
} as const;

type Fact = {
  readonly field: keyof typeof chipCopy.fields;
  readonly value: string | null;
  readonly chip?: string;
};

const termsFacts = (terms: StudioTerms): Fact[] => {
  const rate = parsePercent(terms.rate);
  const weights = parsedBps(terms.weights);
  const hold = holdSecondsOf(terms.hold);
  const count = terms.weights.length;
  return [
    { field: "rate", value: rate.ok ? formatBps(rate.value) : null },
    {
      field: "levels",
      value: count === 1 ? chipCopy.level : fill(chipCopy.levels, { count: String(count) }),
    },
    { field: "split", value: weights ? formatSplit(weights) : null },
    {
      field: "shortPath",
      value:
        terms.shortPathMode === "RENORMALIZE_EXISTING"
          ? chipCopy.renormalize
          : chipCopy.returnUnused,
    },
    hold === null
      ? { field: "hold", value: null }
      : {
          field: "hold",
          value: holdWords(hold),
          chip: fill(chipCopy.hold, { hold: holdAdjective(hold) }),
        },
  ];
};

export const termsChips = (terms: StudioTerms): string[] =>
  termsFacts(terms)
    .map((fact) => fact.chip ?? fact.value)
    .filter((value) => value !== null);

export const termsChanges = (before: StudioTerms, after: StudioTerms): string[] => {
  const previous = termsFacts(before);
  return termsFacts(after).flatMap((fact, index) => {
    const old = previous[index]?.value ?? null;
    if (old === fact.value || old === null || fact.value === null) return [];
    return [
      fill(chipCopy.change, { field: chipCopy.fields[fact.field], before: old, after: fact.value }),
    ];
  });
};
