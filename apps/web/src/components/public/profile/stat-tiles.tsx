import { demoToken } from "@spoke/protocol";
import type { ReactNode } from "react";
import { Amount } from "@/components/ui/amount";
import { Card } from "@/components/ui/card";
import { formatCount, type TokenLike } from "@/lib/format";
import { profileCopy } from "../copy/profile";
import type { AnyProfile } from "./types";

type TileData = { key: string; label: string; value: ReactNode; caption?: string | undefined };

const count = (value: number | null) => (value === null ? null : formatCount(value));

function Tile({ label, value, caption }: Omit<TileData, "key">) {
  return (
    <Card className="flex flex-col gap-2">
      <p className="text-subtle text-sm">{label}</p>
      <div className="text-ink font-mono text-lead tabular-nums sm:text-2xl">{value}</div>
      {caption ? <p className="text-subtle text-sm">{caption}</p> : null}
    </Card>
  );
}

const tokenOf = (profile: AnyProfile): TokenLike | null => {
  const symbols = new Set(profile.evidence.items.map((receipt) => receipt.token.symbol));
  if (symbols.size > 1) return null;
  return profile.evidence.items[0]?.token ?? demoToken;
};

export function StatTiles({ profile }: { profile: AnyProfile }) {
  const token = tokenOf(profile);
  const money = (value: string | null, testnet = false) =>
    value === null || token === null ? null : (
      <Amount
        amount={BigInt(value)}
        token={token}
        testnet={testnet}
        size="lead"
        className="sm:text-2xl"
      />
    );
  const tiles: TileData[] = [
    { key: "settled", label: profileCopy.tiles.settled, value: count(profile.settledConversions) },
    {
      key: "merchants",
      label: profileCopy.tiles.merchants,
      value: count(profile.merchantCount),
      caption: profileCopy.tiles.merchantsCaption,
    },
    { key: "campaigns", label: profileCopy.tiles.campaigns, value: count(profile.campaignCount) },
    {
      key: "value",
      label: profileCopy.tiles.value,
      value: money(profile.netAttributedValue, true),
    },
    {
      key: "commission",
      label: profileCopy.tiles.commission,
      value: money(profile.settledCommission),
    },
    { key: "median", label: profileCopy.tiles.median, value: money(profile.median) },
    {
      key: "refunded",
      label: profileCopy.tiles.refunded,
      value: money(profile.refundAdjustment),
      caption: profileCopy.tiles.refundedCaption,
    },
    {
      key: "pending",
      label: profileCopy.tiles.pending,
      value: count(profile.pendingConversions),
    },
  ];
  const shown = tiles.filter((tile) => tile.value !== null);
  if (shown.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {shown.map((tile) => (
        <Tile key={tile.key} label={tile.label} value={tile.value} caption={tile.caption} />
      ))}
    </div>
  );
}
