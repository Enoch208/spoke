import {
  CheckmarkBadge01Icon,
  Clock01Icon,
  Coins01Icon,
  Link01Icon,
  QrCodeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PanelBackdrop } from "./panel-backdrop";

const receipts = [
  {
    tag: "Sale confirmed",
    tagClass: "bg-sky-soft text-sky-deep",
    text: "Buyer paid 100.00 SDUSD through Dana's link.",
    icon: Coins01Icon,
    tilt: "rotate-[8deg] translate-x-2",
  },
  {
    tag: "Reward reserved",
    tagClass: "bg-amber-soft text-amber-deep",
    text: "10.00 SDUSD held from the funded pool for four contributors.",
    icon: Clock01Icon,
    tilt: "",
  },
  {
    tag: "Settled",
    tagClass: "bg-lime-soft text-lime-deep",
    text: "Hold passed. Every share is ready to claim.",
    icon: CheckmarkBadge01Icon,
    tilt: "-rotate-[12deg] -translate-x-1",
  },
] as const;

export function SalesArt() {
  return (
    <div className="relative size-full overflow-hidden rounded-2xl">
      <PanelBackdrop tone="sky" />
      <div className="font-ui relative flex h-full flex-col justify-center gap-3 px-4">
        {receipts.map((receipt) => (
          <div
            key={receipt.tag}
            className={`bg-surface rounded-xl p-3 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] ${receipt.tilt}`}
          >
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${receipt.tagClass}`}
            >
              {receipt.tag}
            </span>
            <p className="mt-2 text-[11px] leading-snug">{receipt.text}</p>
            <HugeiconsIcon
              icon={receipt.icon}
              size={14}
              className="text-faint mt-2"
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShareArt() {
  return (
    <div className="relative size-full overflow-hidden rounded-2xl">
      <PanelBackdrop tone="pink" />
      <div className="font-ui relative flex h-full items-center px-4">
        <div className="bg-surface w-full rounded-xl p-4 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.25)]">
          <p className="text-[12px] font-medium">Share and earn</p>
          <p className="text-subtle mt-1 text-[9px]">Your link joins under Chi&apos;s branch.</p>
          <div className="border-line mt-3 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[10px]">
            <HugeiconsIcon icon={Link01Icon} size={12} aria-hidden="true" />
            <span className="font-mono">spoke.link/r/8f2k</span>
          </div>
          <div className="border-line mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[10px]">
            <HugeiconsIcon icon={QrCodeIcon} size={12} aria-hidden="true" />
            QR share card
          </div>
          <p className="text-muted mt-3 text-[9px]">If a sale settles through you</p>
          <div className="mt-1.5 grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
            {["50%", "25%", "15%", "10%"].map((weight, index) => (
              <span
                key={weight}
                className={`rounded-md py-1 ${index === 0 ? "bg-lime text-olive" : "bg-soft"}`}
              >
                {weight}
              </span>
            ))}
          </div>
          <span className="bg-ink text-soft mt-4 block rounded-full py-1.5 text-center text-[10px] font-medium">
            Create my link
          </span>
        </div>
      </div>
    </div>
  );
}

export function RecordArt() {
  return (
    <div className="relative size-full overflow-hidden rounded-2xl">
      <PanelBackdrop tone="lime" />
      <div className="font-ui relative flex h-full items-end pl-5">
        <div className="bg-surface h-[85%] w-full rounded-tl-xl p-4 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.2)]">
          <p className="text-[15px] font-medium">Dana</p>
          <p className="text-subtle text-[9px]">Portable distribution record</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[9px]">
            {[
              ["Settled sales", "2"],
              ["Merchants", "2"],
              ["Commission", "7.50"],
              ["Refunded", "0"],
            ].map(([label, value]) => (
              <span key={label} className="text-subtle">
                {label}
                <span className="text-ink block font-mono text-[13px]">{value}</span>
              </span>
            ))}
          </div>
          <div className="border-hairline mt-4 border-t pt-3 text-[10px]">
            <p className="flex justify-between">
              <span>Lumen Labs</span>
              <span className="text-lime-deep">Finalized</span>
            </p>
            <p className="mt-2 flex justify-between">
              <span>Northwind Kits</span>
              <span className="text-lime-deep">Finalized</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
