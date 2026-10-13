import { CancelCircleIcon } from "@hugeicons/core-free-icons";
import { Piece, type PieceShape } from "@/components/art/piece";
import { PanelBackdrop } from "@/components/landing/panel-backdrop";
import { ModeBadge } from "@/components/ui/mode-badge";
import { StatusChip } from "@/components/ui/status-chip";
import { cx } from "@/components/ui/cx";
import { setupCopy as copy } from "../copy/setup";
import { slugSeed } from "./setup-form";

const shapes = ["lime", "pink", "block"] as const satisfies readonly PieceShape[];
const tiles = ["bg-lime-soft", "bg-pink-soft", "bg-lilac-soft", "bg-sky-soft"] as const;

export function DefaultLogo({ slug, className }: { slug: string; className?: string }) {
  const seed = slugSeed(slug || "spoke");
  const shape = shapes[seed % shapes.length] ?? "lime";
  const tile = tiles[Math.floor(seed / shapes.length) % tiles.length] ?? "bg-lime-soft";
  return (
    <span
      aria-hidden="true"
      className={cx(
        "relative flex items-center justify-center overflow-hidden rounded-2xl",
        tile,
        className,
      )}
    >
      <Piece id={`merchant-logo-${String(seed)}`} shape={shape} className="h-3/5" />
    </span>
  );
}

export function MerchantPreview({
  name,
  slug,
  description,
  demo,
}: {
  name: string;
  slug: string;
  description: string;
  demo: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-5 sm:p-8">
      <PanelBackdrop tone="lime" />
      <div className="relative space-y-3">
        <p className="text-ink/70 text-sm font-medium">{copy.preview}</p>
        <div className="bg-surface shadow-frame space-y-4 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <DefaultLogo slug={slug} className="size-14 shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-h4 text-ink truncate font-medium">
                {name.trim() || copy.previewName}
              </p>
              <p className="text-subtle truncate font-mono text-sm">
                {copy.fields.slugPrefix}
                {slug || "…"}
              </p>
            </div>
          </div>
          {description.trim() ? <p className="text-body text-sm">{description}</p> : null}
          <div className="flex flex-wrap gap-2">
            <StatusChip label={copy.notVerified} icon={CancelCircleIcon} tone="faint" />
            {demo ? <ModeBadge mode="demo" /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
