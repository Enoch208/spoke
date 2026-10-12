const nodes = [
  { id: "m", label: "Lumen Labs", x: 56, y: 200, kind: "merchant" },
  { id: "a", label: "Ada", x: 170, y: 200, kind: "paid" },
  { id: "b", label: "Ben", x: 284, y: 200, kind: "paid" },
  { id: "c", label: "Chi", x: 398, y: 130, kind: "paid" },
  { id: "d", label: "Dana", x: 512, y: 130, kind: "paid" },
  { id: "e", label: "Buyer", x: 626, y: 130, kind: "buyer" },
  { id: "f", label: "Fay", x: 398, y: 280, kind: "branch" },
  { id: "g", label: "Gus", x: 512, y: 280, kind: "branch" },
  { id: "h", label: "Hana", x: 512, y: 360, kind: "branch" },
] as const;

const edges = [
  ["m", "a", "paid"],
  ["a", "b", "paid"],
  ["b", "c", "paid"],
  ["c", "d", "paid"],
  ["d", "e", "buy"],
  ["b", "f", "branch"],
  ["f", "g", "branch"],
  ["f", "h", "branch"],
] as const;

const at = (id: string) => nodes.find((node) => node.id === id) ?? nodes[0];

const nodeStyle = {
  merchant: { fill: "var(--color-ink)", text: "var(--color-soft)", ring: "var(--color-ink)" },
  paid: { fill: "var(--color-lime)", text: "var(--color-olive)", ring: "var(--color-olive)" },
  buyer: { fill: "var(--color-pink)", text: "var(--color-ink)", ring: "var(--color-pink-deep)" },
  branch: { fill: "var(--color-surface)", text: "var(--color-muted)", ring: "var(--color-line)" },
} as const;

const edgeStyle = {
  paid: { stroke: "var(--color-olive)", width: 2.5, dash: "0" },
  buy: { stroke: "var(--color-pink-deep)", width: 2, dash: "5 5" },
  branch: { stroke: "var(--color-line)", width: 2, dash: "0" },
} as const;

export function NetworkGraph() {
  return (
    <svg
      viewBox="0 0 682 400"
      className="size-full"
      role="img"
      aria-label="Example distribution graph"
    >
      {edges.map(([from, to, kind]) => {
        const a = at(from);
        const b = at(to);
        const midX = (a.x + b.x) / 2;
        const style = edgeStyle[kind];
        return (
          <path
            key={`${from}-${to}`}
            d={`M${String(a.x)} ${String(a.y)} C${String(midX)} ${String(a.y)} ${String(midX)} ${String(b.y)} ${String(b.x)} ${String(b.y)}`}
            fill="none"
            stroke={style.stroke}
            strokeWidth={style.width}
            strokeDasharray={style.dash}
          />
        );
      })}
      {nodes.map((node) => {
        const style = nodeStyle[node.kind];
        return (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={22}
              fill={style.fill}
              stroke={style.ring}
              strokeWidth={1.5}
            />
            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              fontSize={node.kind === "merchant" ? 8.5 : 10}
              fontWeight={600}
              fill={style.text}
            >
              {node.kind === "merchant" ? "Merchant" : node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
