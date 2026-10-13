import { Piece, type PieceShape, type PieceTone } from "@/components/art/piece";
import { cx } from "@/components/ui/cx";

const shapes: readonly PieceShape[] = ["lime", "olive", "block", "pink"];
const tones: readonly { tone: PieceTone; fill: string }[] = [
  { tone: "lime", fill: "bg-lime-soft" },
  { tone: "pink", fill: "bg-pink-soft" },
  { tone: "sky", fill: "bg-sky-soft" },
  { tone: "lilac", fill: "bg-lilac-soft" },
  { tone: "olive", fill: "bg-olive-soft" },
];
const turns = ["rotate-0", "rotate-90", "rotate-180", "-rotate-90"] as const;

const sizes = {
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-16",
} as const;

const hash = (text: string) => {
  let value = 0x811c9dc5;
  for (const char of text.toLowerCase()) {
    value ^= char.codePointAt(0) ?? 0;
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
};

export const avatarLook = (seed: string) => {
  const value = hash(seed);
  const shape = shapes[value % shapes.length] ?? "lime";
  const tone = tones[Math.floor(value / 7) % tones.length] ?? {
    tone: "lime",
    fill: "bg-lime-soft",
  };
  const turn = turns[Math.floor(value / 131) % turns.length] ?? "rotate-0";
  return { shape, tone: tone.tone, fill: tone.fill, turn };
};

export function PieceAvatar({
  seed,
  size = "md",
  className,
}: {
  seed: string;
  size?: keyof typeof sizes;
  className?: string | undefined;
}) {
  const look = avatarLook(seed);
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        sizes[size],
        look.fill,
        className,
      )}
    >
      <Piece
        id={`avatar-${String(hash(seed))}`}
        shape={look.shape}
        tone={look.tone}
        className={cx("w-[62%]", look.turn)}
      />
    </span>
  );
}

export const avatarSeeds = (base: string, round: number) =>
  Array.from({ length: 8 }, (_, index) => `${base}:${String(round)}:${String(index)}`);
