"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/copy";
import { studioPageCopy } from "./copy-page";
import type { LibraryTemplate } from "./starting-points";

const copy = studioPageCopy.editor;

export function EditorHeader({
  selected,
  dirty,
  saving,
  onSaveNew,
  onSaveVersion,
  onDuplicate,
}: {
  selected: LibraryTemplate | null;
  dirty: boolean;
  saving: boolean;
  onSaveNew: () => void;
  onSaveVersion: () => void;
  onDuplicate: () => void;
}) {
  const own = selected?.source === "mine";
  const archived = selected?.status === "archived";
  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-display text-h4 text-ink font-medium tracking-[-0.01em]">
            {selected?.name ?? copy.unsaved}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {selected ? (
              <Badge tone={own ? "lilac" : "sky"}>{own ? copy.mine : copy.fromSpoke}</Badge>
            ) : null}
            {own ? (
              <span className="text-subtle font-mono text-xs">{`v${String(selected.version)}`}</span>
            ) : null}
            {dirty ? (
              <Badge tone="amber" dot>
                {copy.edited}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {own && !archived ? (
            <Button size="sm" loading={saving} disabled={!dirty} onClick={onSaveVersion}>
              {fill(copy.saveVersion, { version: String(selected.version + 1) })}
            </Button>
          ) : null}
          {own ? (
            <Button size="sm" variant="secondary" onClick={onDuplicate}>
              {copy.duplicate}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" loading={saving} onClick={onSaveNew}>
              {copy.save}
            </Button>
          )}
        </div>
      </div>
      {archived ? <p className="text-subtle text-sm">{copy.archivedNote}</p> : null}
    </Card>
  );
}
