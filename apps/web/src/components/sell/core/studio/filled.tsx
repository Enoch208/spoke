import { Fragment, type ReactNode } from "react";

const placeholder = /(\{[A-Za-z][A-Za-z0-9]*\})/g;

export function Filled({
  template,
  values,
}: {
  template: string;
  values: Readonly<Record<string, ReactNode>>;
}) {
  const parts = template.split(placeholder);
  return (
    <>
      {parts.map((part, index) => {
        const key = /^\{([A-Za-z][A-Za-z0-9]*)\}$/.exec(part)?.[1];
        const slot = key === undefined ? undefined : values[key];
        return <Fragment key={`${String(index)}-${part}`}>{slot ?? part}</Fragment>;
      })}
    </>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono tabular-nums">{children}</span>;
}
