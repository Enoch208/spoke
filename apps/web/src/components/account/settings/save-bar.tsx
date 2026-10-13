"use client";

import { Button } from "@/components/ui/button";
import { settingsCopy } from "../copy/settings";

export function SaveBar({
  visible,
  saving,
  error,
  canSave,
  onDiscard,
  onSave,
}: {
  visible: boolean;
  saving: boolean;
  error: string | null;
  canSave: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="animate-toast-in fixed inset-x-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 lg:sticky lg:inset-x-auto lg:bottom-6">
      <div
        role="region"
        aria-label={settingsCopy.saveBar.unsaved}
        className="bg-surface border-line shadow-frame flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <p className="text-ink flex items-center gap-2 text-sm font-medium">
            <span aria-hidden="true" className="bg-amber-deep size-2 rounded-full" />
            {settingsCopy.saveBar.unsaved}
          </p>
          {error ? (
            <p role="alert" className="text-pink-ink text-sm">
              {error}
            </p>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" onClick={onDiscard}>
          {settingsCopy.saveBar.discard}
        </Button>
        <Button
          size="sm"
          loading={saving}
          loadingLabel={settingsCopy.saveBar.saving}
          disabled={!canSave}
          onClick={onSave}
        >
          {settingsCopy.saveBar.save}
        </Button>
      </div>
    </div>
  );
}
