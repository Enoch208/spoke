"use client";

import { ChartLineData01Icon, Table01Icon } from "@hugeicons/core-free-icons";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { chartCopy } from "./copy";

export type ChartTableData = {
  caption: string;
  columns: readonly { key: string; label: string; numeric?: boolean }[];
  rows: readonly { key: string; cells: readonly ReactNode[] }[];
};

export function ChartTable({ data }: { data: ChartTableData }) {
  return (
    <Table caption={data.caption}>
      <THead>
        <tr>
          {data.columns.map((column) => (
            <Th key={column.key} numeric={column.numeric ?? false}>
              {column.label}
            </Th>
          ))}
        </tr>
      </THead>
      <TBody>
        {data.rows.map((row) => (
          <Tr key={row.key}>
            {row.cells.map((cell, index) => (
              <Td
                key={data.columns[index]?.key ?? String(index)}
                numeric={data.columns[index]?.numeric ?? false}
                className="h-11 whitespace-nowrap"
              >
                {cell}
              </Td>
            ))}
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

export function ChartFrame({
  title,
  description,
  legend,
  table,
  aside,
  dimmed = false,
  empty,
  defaultView = "chart",
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  legend?: ReactNode;
  table: ChartTableData;
  aside?: ReactNode;
  dimmed?: boolean;
  empty?: ReactNode;
  defaultView?: "chart" | "table";
  className?: string | undefined;
  children: ReactNode;
}) {
  const [view, setView] = useState(defaultView);
  const showTable = view === "table";
  return (
    <Card className={cx("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-ui text-ink text-base font-medium">{title}</h2>
          {description ? <p className="text-subtle mt-0.5 text-sm">{description}</p> : null}
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={showTable ? ChartLineData01Icon : Table01Icon}
          aria-pressed={showTable}
          onClick={() => {
            setView(showTable ? "chart" : "table");
          }}
        >
          {showTable ? chartCopy.chart : chartCopy.table}
        </Button>
      </div>
      {legend && !showTable && !empty ? legend : null}
      <div
        className={cx(
          "ease-fade min-w-0 transition-opacity duration-[400ms]",
          dimmed && "opacity-60",
        )}
      >
        {empty ? (
          <div className="bg-soft text-subtle flex min-h-40 items-center justify-center rounded-xl px-6 py-10 text-center text-sm">
            {empty}
          </div>
        ) : showTable ? (
          <ChartTable data={table} />
        ) : (
          children
        )}
      </div>
      {aside}
    </Card>
  );
}
