"use client";

import {
  CenterFocusIcon,
  FullScreenIcon,
  MinimizeScreenIcon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { explorerCopy as copy } from "./copy";
import { Segmented } from "./segmented";
import { depthOptions, type DepthOption, type ViewOption } from "./use-explorer-state";
import type { Scope } from "./use-graph-data";

export function ExplorerControls({
  campaignSelect,
  scope,
  onScope,
  view,
  onView,
  depth,
  onDepth,
  allDisabled,
  search,
  onZoomIn,
  onZoomOut,
  onFit,
  fullScreen,
  onFullScreen,
}: {
  campaignSelect: ReactNode;
  scope: Scope | null;
  onScope: (scope: Scope) => void;
  view: ViewOption;
  onView: (view: ViewOption) => void;
  depth: DepthOption;
  onDepth: (depth: DepthOption) => void;
  allDisabled: boolean;
  search: ReactNode;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  fullScreen: boolean;
  onFullScreen: () => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {campaignSelect}
        {scope ? (
          <Segmented
            label={copy.scope.label}
            value={scope}
            onChange={onScope}
            options={[
              { value: "me", label: copy.scope.me },
              { value: "campaign", label: copy.scope.campaign },
            ]}
          />
        ) : null}
        <Segmented
          label={copy.view.label}
          value={view}
          onChange={onView}
          options={[
            { value: "graph", label: copy.view.graph },
            { value: "table", label: copy.view.table },
            { value: "path", label: copy.view.path },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {search}
        <div className="w-48">
          <Select
            value={depth}
            onValueChange={onDepth}
            options={depthOptions.map((option) => ({
              value: option,
              label: `${copy.depth}: ${option === "all" ? copy.depthAll : option}`,
              disabled: option === "all" && allDisabled,
            }))}
          />
        </div>
        {allDisabled ? (
          <Tooltip content={copy.depthTooMany}>
            <span tabIndex={0} className="text-subtle text-xs">
              {copy.depthAll}
            </span>
          </Tooltip>
        ) : null}
        {view === "graph" ? (
          <div className="flex items-center gap-1">
            <IconButton
              icon={ZoomInAreaIcon}
              label={copy.zoomIn}
              variant="pill"
              onClick={onZoomIn}
            />
            <IconButton
              icon={ZoomOutAreaIcon}
              label={copy.zoomOut}
              variant="pill"
              onClick={onZoomOut}
            />
            <IconButton icon={CenterFocusIcon} label={copy.fit} variant="pill" onClick={onFit} />
            <IconButton
              icon={fullScreen ? MinimizeScreenIcon : FullScreenIcon}
              label={fullScreen ? copy.exitFullScreen : copy.fullScreen}
              variant="pill"
              onClick={onFullScreen}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
