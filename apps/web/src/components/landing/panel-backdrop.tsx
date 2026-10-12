import { Cloud } from "@/components/art/cloud";

const tones = {
  pink: "from-pink-soft via-[color-mix(in_oklab,var(--color-pink)_55%,white)] to-lilac",
  sky: "from-sky-soft via-[color-mix(in_oklab,var(--color-sky)_45%,white)] to-sky-soft",
  lime: "from-lime-soft via-[color-mix(in_oklab,var(--color-lime)_60%,white)] to-lime-soft",
  lilac: "from-lilac-soft via-[color-mix(in_oklab,var(--color-lilac)_70%,white)] to-pink-soft",
} as const;

export type PanelTone = keyof typeof tones;

export function PanelBackdrop({ tone }: { tone: PanelTone }) {
  return (
    <div aria-hidden="true" className={`absolute inset-0 bg-gradient-to-b ${tones[tone]}`}>
      <Cloud className="text-surface/25 absolute -top-16 -left-20 w-[420px]" />
      <Cloud className="text-surface/20 absolute -top-24 right-10 w-[360px] -scale-x-100" />
      <div className="grain absolute inset-0 opacity-60" />
    </div>
  );
}
