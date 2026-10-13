import { handle, walletAddress, type ClientOutput, type SaleReceipt } from "@spoke/protocol";

type Distributor = ClientOutput<"distributors.search">["items"][number];
export const comparisonLimit = 3;

export const comparisonIdentity = (value: string) => {
  const normalized = value.trim().replace(/^@/, "").toLowerCase();
  return handle.safeParse(normalized).success || walletAddress.safeParse(normalized).success
    ? normalized
    : null;
};

export const comparisonIds = (value: string | null) =>
  [
    ...new Set(
      (value ?? "")
        .split(",")
        .map(comparisonIdentity)
        .filter((id) => id !== null),
    ),
  ].slice(0, comparisonLimit);

export const distributorIdentity = (card: Pick<Distributor, "handle" | "address">) =>
  comparisonIdentity(card.handle ?? card.address ?? "");

export const toggleComparison = (selected: readonly string[], id: string) => {
  const normalized = comparisonIdentity(id);
  if (!normalized) return [...selected];
  if (selected.includes(normalized)) return selected.filter((value) => value !== normalized);
  return selected.length < comparisonLimit ? [...selected, normalized] : [...selected];
};

export const uniqueDistributors = (cards: readonly Distributor[]) => {
  const identities = new Set<string>();
  return cards.filter((card) => {
    const id = distributorIdentity(card);
    if (!id || identities.has(id)) return false;
    identities.add(id);
    return true;
  });
};

export const comparisonToken = (profile: {
  settledConversions: number | null;
  evidence: { items: readonly Pick<SaleReceipt, "chainId" | "token">[]; nextCursor: string | null };
}) => {
  const receipts = profile.evidence.items;
  const first = receipts[0];
  return first &&
    profile.evidence.nextCursor === null &&
    profile.settledConversions === receipts.length &&
    receipts.every(
      (receipt) =>
        receipt.token.address.toLowerCase() === first.token.address.toLowerCase() &&
        receipt.chainId === first.chainId &&
        receipt.token.decimals === first.token.decimals,
    )
    ? first.token
    : null;
};
