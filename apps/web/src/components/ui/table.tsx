import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cx } from "./cx";

export function Table({
  caption,
  captionHidden = true,
  className,
  children,
}: {
  caption: string;
  captionHidden?: boolean;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={cx("max-w-full overflow-x-auto", className)}>
      <table className="font-ui w-full border-collapse text-left text-sm">
        <caption className={cx("text-subtle pb-2 text-left text-sm", captionHidden && "sr-only")}>
          {caption}
        </caption>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-line border-b">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-hairline divide-y">{children}</tbody>;
}

export function Tr({
  selected = false,
  interactive = false,
  className,
  ...rest
}: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean; interactive?: boolean }) {
  return (
    <tr
      aria-selected={selected || undefined}
      className={cx(
        interactive &&
          "hover:bg-soft cursor-pointer transition-colors duration-[423ms] ease-spring",
        selected && "bg-soft",
        className,
      )}
      {...rest}
    />
  );
}

export function Th({
  numeric = false,
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cx(
        "text-subtle h-10 px-3 font-medium whitespace-nowrap first:pl-4 last:pr-4",
        numeric && "text-right",
        className,
      )}
      {...rest}
    />
  );
}

export function Td({
  numeric = false,
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cx(
        "text-ink h-14 px-3 align-middle first:pl-4 last:pr-4",
        numeric && "text-right font-mono tabular-nums",
        className,
      )}
      {...rest}
    />
  );
}
