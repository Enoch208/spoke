"use client";

import { useRouter } from "next/navigation";
import { cx } from "@/components/ui/cx";
import { shellCopy } from "@/lib/copy";
import { routes, withNext } from "@/lib/routes";
import { useModeStore } from "@/lib/stores/mode";
import { useSessionStore } from "@/lib/stores/session";
import { useWorkspaceStore, workspaces, type Workspace } from "@/lib/stores/workspace";
import type { ShellArea } from "./use-area";

export const workspaceHome = (workspace: Workspace) =>
  workspace === "earn" ? routes.earn.home : routes.sell.overview;

export const useSwitchWorkspace = () => {
  const router = useRouter();
  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace);
  const isMerchant = useSessionStore((state) => state.isMerchant);
  const mode = useModeStore((state) => state.mode);
  return (workspace: Workspace) => {
    setWorkspace(workspace);
    if (workspace === "sell" && mode === "live" && !isMerchant) {
      router.push(withNext(routes.sell.setup, routes.sell.overview));
      return;
    }
    router.push(workspaceHome(workspace));
  };
};

export function WorkspaceSwitcher({ area }: { area: ShellArea }) {
  const switchTo = useSwitchWorkspace();
  return (
    <div
      role="radiogroup"
      aria-label={shellCopy.workspaceLabel}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        switchTo(area === "earn" ? "sell" : "earn");
      }}
      className="bg-pill font-ui inline-flex h-10 items-center rounded-3xl p-1 text-sm font-medium"
    >
      {workspaces.map((workspace) => {
        const checked = area === workspace;
        return (
          <button
            key={workspace}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (area === "ops" && workspace === "earn") ? 0 : -1}
            onClick={() => {
              switchTo(workspace);
            }}
            className={cx(
              "h-8 rounded-3xl px-4 [transition-duration:423ms] [transition-property:background-color,color] [transition-timing-function:var(--ease-spring)]",
              checked ? "bg-surface text-ink shadow-frame" : "text-muted hover:text-ink",
            )}
          >
            {shellCopy.workspaces[workspace]}
          </button>
        );
      })}
    </div>
  );
}
