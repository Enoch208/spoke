import { getAddress, isAddress } from "viem";

const ellipsis = "…";

const truncateHex = (value: string) =>
  value.length <= 12 ? value : `${value.slice(0, 6)}${ellipsis}${value.slice(-4)}`;

export const checksumAddress = (address: string) =>
  isAddress(address, { strict: false }) ? getAddress(address) : address;

export const shortAddress = (address: string) => truncateHex(checksumAddress(address));

export const shortHash = (hash: string) => truncateHex(hash.toLowerCase());

export const formatHandle = (handle: string) => `@${handle.replace(/^@/, "").toLowerCase()}`;

export const formatPerson = (person: {
  handle?: string | null;
  address?: string | null;
  isSelf?: boolean;
}) => {
  if (person.isSelf) return "You";
  if (person.handle) return formatHandle(person.handle);
  if (person.address) return shortAddress(person.address);
  return "Someone";
};

const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const formatCount = (value: number | bigint) => {
  const digits = typeof value === "bigint" ? value.toString() : String(Math.trunc(value));
  return digits.startsWith("-") ? `-${groupThousands(digits.slice(1))}` : groupThousands(digits);
};

export const pluralize = (count: number | bigint, singular: string, plural = `${singular}s`) =>
  `${formatCount(count)} ${count === 1 || count === 1n ? singular : plural}`;

export const formatBlock = (block: number | bigint | string) =>
  `Block ${formatCount(typeof block === "string" ? BigInt(block) : block)}`;

const numberWords = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

export const numberWord = (value: number) => numberWords[value] ?? formatCount(value);

export const formatId = (kind: "Campaign" | "Sale" | "Link", id: string) => `${kind} #${id}`;
