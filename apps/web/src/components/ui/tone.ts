export const tones = ["lime", "amber", "lilac", "sky", "pink", "ink", "faint"] as const;

export type Tone = (typeof tones)[number];

export const toneClasses = {
  lime: { fill: "bg-lime-soft", text: "text-lime-ink" },
  amber: { fill: "bg-amber-soft", text: "text-amber-ink" },
  lilac: { fill: "bg-lilac-soft", text: "text-lilac-deep" },
  sky: { fill: "bg-sky-soft", text: "text-sky-ink" },
  pink: { fill: "bg-pink-soft", text: "text-pink-ink" },
  ink: { fill: "bg-pill", text: "text-ink" },
  faint: { fill: "bg-soft", text: "text-muted" },
} as const satisfies Record<Tone, { fill: string; text: string }>;
