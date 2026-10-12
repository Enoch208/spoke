export const avatarFills = [
  "bg-lime-soft text-olive",
  "bg-pink-soft text-pink-ink",
  "bg-lilac-soft text-lilac-deep",
  "bg-sky-soft text-sky-ink",
  "bg-olive-soft text-olive",
  "bg-amber-soft text-amber-ink",
] as const;

export type AvatarFill = (typeof avatarFills)[number];

const fnv1a = (text: string): number => {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
};

export const avatarFor = (seed: string): AvatarFill =>
  avatarFills[fnv1a(seed.toLowerCase()) % avatarFills.length] ?? avatarFills[0];

export const avatarInitial = ({ name }: { name: string | null | undefined }): string =>
  (name ?? "").replace(/^@/, "").trim().charAt(0).toUpperCase();
