import type { CSSProperties } from "react";

const shapes = {
  lime: { box: "0 0 490 362", paths: ["M490 87 339 0 0 196v166l336-183 154 85z"] },
  olive: {
    box: "0 0 570 415",
    paths: ["M331 0 208 69v41l201 116v189l161-94V136z", "M0 138l165 98V67l-22-9z"],
  },
  block: { box: "0 0 362 415", paths: ["M123 0 0 69v41l201 116v189l161-94V136z"] },
  pink: { box: "0 0 349 416", paths: ["M274 0 0 148v114l264 154 63-32V272l-104-60 126-68V44z"] },
} as const;

const tones = {
  lime: "var(--color-lime)",
  block: "var(--color-olive)",
  pink: "var(--color-pink)",
  olive: "var(--color-olive)",
  sky: "var(--color-sky)",
  lilac: "var(--color-lilac)",
} as const;

export type PieceShape = keyof typeof shapes;
export type PieceTone = keyof typeof tones;

export function Piece({
  id,
  shape,
  tone = shape,
  className,
  style,
}: {
  id: string;
  shape: PieceShape;
  tone?: PieceTone;
  className?: string;
  style?: CSSProperties;
}) {
  const { box, paths } = shapes[shape];
  const base = tones[tone];
  return (
    <svg viewBox={box} className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: `color-mix(in oklab, ${base} 45%, white)` }} />
          <stop offset="0.55" style={{ stopColor: base }} />
          <stop offset="1" style={{ stopColor: `color-mix(in oklab, ${base} 82%, black)` }} />
        </linearGradient>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feComposite in="mono" in2="SourceGraphic" operator="in" result="speckle" />
          <feBlend in="SourceGraphic" in2="speckle" mode="soft-light" />
        </filter>
      </defs>
      <g filter={`url(#${id}-grain)`}>
        {paths.map((d) => (
          <path key={d} d={d} fill={`url(#${id}-fill)`} />
        ))}
      </g>
    </svg>
  );
}
