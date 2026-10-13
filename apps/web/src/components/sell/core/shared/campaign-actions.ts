"use client";

import {
  Copy01Icon,
  Copy02Icon,
  LinkSquare02Icon,
  MoneyAdd01Icon,
  PauseIcon,
  PlayIcon,
  Rocket01Icon,
  StopCircleIcon,
  WalletRemove01Icon,
} from "@hugeicons/core-free-icons";
import type { CampaignStateKey } from "@/lib/copy";
import { useClientContext } from "@/lib/client/provider";
import { routeTo } from "@/lib/routes";
import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import { useCopy } from "@/components/ui/use-copy";
import { campaignsCopy as copy } from "../copy/campaigns";
import type { MenuItem } from "./action-menu";
import { canEnd, canPause, canResume, canTopUp, canWithdraw, isClosed } from "./campaign-rules";

export type CampaignContext = {
  campaignId: string;
  stateKey: CampaignStateKey;
  available: bigint;
};

const ui = useUiStore.getState;

export function useLaunchRecordId(campaignId: string) {
  const { mode } = useClientContext();
  return useTxStore(
    (state) =>
      state.records.find(
        (record) =>
          record.kind === "createCampaign" &&
          record.mode === mode &&
          record.context.campaignId === campaignId,
      )?.id ?? null,
  );
}

export function useCampaignActions(ctx: CampaignContext) {
  const launchId = useLaunchRecordId(ctx.campaignId);
  const copyText = useCopy();
  const { campaignId, stateKey } = ctx;
  const unfinished = stateKey === "notFunded" || stateKey === "notLiveYet";
  const finish: MenuItem | null =
    unfinished && launchId
      ? {
          key: "finish",
          label: copy.finishLaunch,
          icon: Rocket01Icon,
          onSelect: () => {
            ui().open("M-11", { txId: launchId });
          },
        }
      : null;
  const topUp: MenuItem = {
    key: "topUp",
    label: copy.addBudget,
    icon: MoneyAdd01Icon,
    onSelect: () => {
      ui().open("M-23", { campaignId });
    },
  };
  const pause: MenuItem = {
    key: "pause",
    label: copy.pause,
    icon: PauseIcon,
    onSelect: () => {
      ui().open("M-25", { campaignId, mode: "pause" });
    },
  };
  const resume: MenuItem = {
    key: "resume",
    label: copy.resume,
    icon: PlayIcon,
    onSelect: () => {
      ui().open("M-25", { campaignId, mode: "resume" });
    },
  };
  const withdraw: MenuItem = {
    key: "withdraw",
    label: copy.withdraw,
    icon: WalletRemove01Icon,
    onSelect: () => {
      ui().open("M-24", { campaignId });
    },
  };
  const end: MenuItem = {
    key: "end",
    label: copy.end,
    icon: StopCircleIcon,
    danger: true,
    onSelect: () => {
      ui().open("M-26", { campaignId });
    },
  };
  const shared: MenuItem[] = [
    {
      key: "public",
      label: copy.publicPage,
      icon: LinkSquare02Icon,
      href: routeTo.campaign(campaignId),
    },
    {
      key: "link",
      label: copy.copyLink,
      icon: Copy01Icon,
      onSelect: () => {
        void copyText(`${window.location.origin}${routeTo.campaign(campaignId)}`, copy.linkCopied);
      },
    },
    {
      key: "duplicate",
      label: copy.duplicate,
      icon: Copy02Icon,
      href: `/sell/campaigns/new?from=${encodeURIComponent(campaignId)}`,
    },
  ];
  const money: MenuItem[] = [
    ...(finish ? [finish] : []),
    ...(canResume(stateKey) ? [resume] : []),
    ...(canTopUp(stateKey) && !unfinished ? [topUp] : []),
    ...(stateKey === "notFunded" && !finish ? [topUp] : []),
    ...(canPause(stateKey) ? [pause] : []),
    ...(canWithdraw(stateKey, ctx.available) ? [withdraw] : []),
  ];
  const primary =
    finish ??
    (stateKey === "exhausted" || stateKey === "notFunded" ? topUp : null) ??
    (canResume(stateKey) ? resume : null) ??
    (isClosed(stateKey) && canWithdraw(stateKey, ctx.available) ? withdraw : null);
  return {
    primary,
    money: money.filter((item) => item !== primary),
    shared,
    end: canEnd(stateKey) ? end : null,
  };
}
