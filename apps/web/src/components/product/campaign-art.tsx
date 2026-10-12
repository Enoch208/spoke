import { Piece, type PieceShape } from "@/components/art/piece";
import { PanelBackdrop, type PanelTone } from "@/components/landing/panel-backdrop";

const looks = [
  { tone: "lilac", shape: "lime" },
  { tone: "sky", shape: "pink" },
  { tone: "pink", shape: "lime" },
  { tone: "lime", shape: "pink" },
] as const satisfies readonly { tone: PanelTone; shape: PieceShape }[];

const lookFor = (seed: string) => {
  let hash = 7;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return looks[hash % looks.length] ?? looks[0];
};

export function CampaignArt({
  seed,
  imageUrl,
  title,
  className,
}: {
  seed: string;
  imageUrl: string | undefined;
  title: string;
  className?: string;
}) {
  if (imageUrl)
    return (
      <div className={`bg-soft relative overflow-hidden ${className ?? ""}`}>
        <img src={imageUrl} alt={title} className="absolute inset-0 size-full object-cover" />
      </div>
    );
  const look = lookFor(seed);
  return (
    <div aria-hidden="true" className={`relative overflow-hidden ${className ?? ""}`}>
      <PanelBackdrop tone={look.tone} />
      <Piece
        id={`campaign-art-${seed}`}
        shape={look.shape}
        className="absolute top-1/2 left-1/2 h-[58%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_18px_24px_rgba(26,26,26,0.12)] transition-transform duration-[423ms] ease-spring group-hover:-translate-y-[54%]"
      />
    </div>
  );
}
