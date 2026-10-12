import type { ReactNode } from "react";
import { cx } from "./cx";

export type KeyValueItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  action?: ReactNode;
};

export function KeyValue({
  items,
  layout = "rows",
  className,
}: {
  items: readonly KeyValueItem[];
  layout?: "rows" | "grid";
  className?: string | undefined;
}) {
  return (
    <dl
      className={cx(
        "font-ui text-sm",
        layout === "rows" ? "divide-hairline flex flex-col divide-y" : "grid gap-4 sm:grid-cols-2",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className={cx(
            "flex min-w-0",
            layout === "rows"
              ? "flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              : "flex-col gap-1",
          )}
        >
          <dt className="text-subtle shrink-0">{item.label}</dt>
          <dd
            className={cx(
              "text-ink flex min-w-0 items-center gap-2 break-words sm:text-right",
              item.mono && "font-mono tabular-nums",
            )}
          >
            <span className="min-w-0">{item.value}</span>
            {item.action}
          </dd>
        </div>
      ))}
    </dl>
  );
}
