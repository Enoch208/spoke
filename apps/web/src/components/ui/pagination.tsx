"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { common, fill } from "@/lib/copy";
import { Button } from "./button";
import { cx } from "./cx";
import { IconButton } from "./icon-button";

export function Pagination({
  page,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  label,
  className,
}: {
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  label: string;
  className?: string | undefined;
}) {
  return (
    <nav
      aria-label={label}
      className={cx("font-ui flex items-center justify-end gap-2", className)}
    >
      <IconButton
        icon={ArrowLeft01Icon}
        label={common.previousPage}
        variant="pill"
        size="sm"
        disabled={!hasPrevious}
        onClick={onPrevious}
      />
      <span aria-current="page" className="text-subtle min-w-16 text-center text-sm">
        {fill(common.page, { page: String(page) })}
      </span>
      <IconButton
        icon={ArrowRight01Icon}
        label={common.nextPage}
        variant="pill"
        size="sm"
        disabled={!hasNext}
        onClick={onNext}
      />
    </nav>
  );
}

export function ShowMore({
  onClick,
  loading = false,
  label = common.showMore,
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <div className="flex justify-center py-4">
      <Button variant="secondary" onClick={onClick} loading={loading}>
        {label}
      </Button>
    </div>
  );
}
