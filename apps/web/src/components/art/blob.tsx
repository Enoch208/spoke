const tones = {
  sky: "bg-sky",
  lime: "bg-lime",
  pink: "bg-pink",
  lilac: "bg-lilac",
} as const;

const shapes = {
  dot: "rounded-full",
  diamond: "rotate-45 rounded-[18%]",
} as const;

export function Blob({
  tone,
  shape,
  className,
}: {
  tone: keyof typeof tones;
  shape: keyof typeof shapes;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute opacity-80 blur-[6px] ${tones[tone]} ${shapes[shape]} ${className ?? ""}`}
    />
  );
}
