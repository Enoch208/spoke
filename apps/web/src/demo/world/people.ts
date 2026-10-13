import type { Address } from "viem";
import { DAY, demoId, sampleAddress } from "./ids";
import type { DemoPerson, Visibility } from "./types";

type Row = readonly [
  name: string,
  visibility: Visibility,
  categories: readonly string[],
  joinedDaysAgo: number,
];

const P: Visibility = "public";
const S: Visibility = "pseudonymous";
const H: Visibility = "private";

const distributorRows: readonly Row[] = [
  ["Mara Lindqvist", P, ["templates", "design", "courses"], 160],
  ["Tomas Reyes", P, ["dev tools", "templates"], 150],
  ["Aiko Tanaka", P, ["design", "templates"], 148],
  ["Kwame Mensah", S, ["courses", "research"], 140],
  ["Priya Raman", P, ["research", "dev tools"], 138],
  ["Lukas Becker", H, ["dev tools"], 135],
  ["Zainab Bello", P, ["templates", "courses"], 130],
  ["Oscar Nilsson", P, ["design"], 128],
  ["Ines Duarte", P, ["templates"], 126],
  ["Hamid Karimi", S, ["dev tools", "research"], 120],
  ["Chloe Martin", P, ["design", "courses"], 118],
  ["Daniel Osei", P, ["templates", "research"], 115],
  ["Yuki Mori", H, ["design"], 112],
  ["Fatima Zahra", P, ["courses"], 110],
  ["Ben Carter", P, ["dev tools"], 105],
  ["Sofia Rossi", P, ["design", "templates"], 100],
  ["Nnamdi Eze", P, ["research"], 98],
  ["Elena Petrova", S, ["templates"], 95],
  ["Marcus Hall", P, ["courses", "templates"], 92],
  ["Leila Haddad", H, ["design"], 90],
  ["Arjun Mehta", P, ["dev tools", "research"], 88],
  ["Grace Kim", P, ["templates"], 85],
  ["Pedro Alves", P, ["courses"], 82],
  ["Amara Nwosu", P, ["design", "templates"], 80],
  ["Jonas Weber", P, ["dev tools"], 76],
  ["Hana Novak", P, ["research"], 72],
  ["Samuel Adeyemi", H, ["templates"], 70],
  ["Clara Jensen", P, ["design"], 66],
  ["Diego Morales", P, ["courses", "dev tools"], 62],
  ["Mei Chen", S, ["research", "templates"], 58],
  ["Felix Wagner", P, ["dev tools"], 54],
  ["Tunde Bakare", P, ["templates", "courses"], 50],
  ["Olivia Brooks", P, ["design"], 45],
  ["Rafael Costa", P, ["research"], 40],
  ["Nadia Ivanova", H, ["courses"], 36],
  ["Kofi Asante", P, ["templates"], 30],
  ["Emma Laurent", P, ["design", "courses"], 24],
  ["Ravi Kapoor", P, ["dev tools"], 18],
  ["Lina Svensson", H, ["templates"], 14],
  ["Moses Kariuki", P, ["research", "courses"], 9],
];

const secondAddressOwners = new Set([7, 11]);

const handleOf = (name: string) => (name.split(" ")[0] ?? name).toLowerCase();

const bioOf = (row: Row) =>
  `Shares ${row[2].join(" and ")} with a small newsletter and a few community channels.`;

export const distributors = (anchor: number): DemoPerson[] =>
  distributorRows.map((row, index) => {
    const n = index + 1;
    const addresses = [sampleAddress(`person:${String(n)}`)];
    if (secondAddressOwners.has(n)) addresses.push(sampleAddress(`person:${String(n)}:second`));
    return {
      id: demoId("u", n),
      addresses,
      handle: handleOf(row[0]),
      displayName: row[0],
      visibility: row[1],
      bio: bioOf(row),
      website: row[1] === P ? `https://example.com/${handleOf(row[0])}` : null,
      categories: [...row[2]],
      joinedAt: anchor - row[3] * DAY,
      acceptsInvitations: row[1] !== H,
      isDistributor: true,
    };
  });

const ownerRows = [
  ["Rhea Castillo", "merchant-a"],
  ["Ivo Marsh", "merchant-b"],
  ["Noor Siddiqui", "merchant-c"],
  ["Gideon Park", "merchant-d"],
  ["Ama Owusu", "merchant-e"],
  ["Lars Holm", "merchant-f"],
] as const;

export const merchantOwners = (anchor: number): DemoPerson[] =>
  ownerRows.map(([name, key], index) => ({
    id: demoId("owner", index + 1),
    addresses:
      index === 0
        ? [sampleAddress(`${key}:main`), sampleAddress(`${key}:business`)]
        : [sampleAddress(`${key}:main`)],
    handle: null,
    displayName: name,
    visibility: "private",
    bio: "",
    website: null,
    categories: [],
    joinedAt: anchor - (200 - index * 10) * DAY,
    acceptsInvitations: false,
    isDistributor: false,
  }));

export const buyerPersona = (anchor: number): DemoPerson => ({
  id: demoId("buyer", "persona"),
  addresses: [sampleAddress("buyer:persona")],
  handle: "sam",
  displayName: "Sam Achebe",
  visibility: "private",
  bio: "",
  website: null,
  categories: [],
  joinedAt: anchor - 40 * DAY,
  acceptsInvitations: false,
  isDistributor: false,
});

export const operator = (anchor: number): DemoPerson => ({
  id: demoId("operator", 1),
  addresses: [sampleAddress("operator:1")],
  handle: null,
  displayName: "Sample operator",
  visibility: "private",
  bio: "",
  website: null,
  categories: [],
  joinedAt: anchor - 300 * DAY,
  acceptsInvitations: false,
  isDistributor: false,
});

export const sampleBuyer = (n: number): Address => sampleAddress(`buyer:${String(n)}`);
