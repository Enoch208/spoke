import {
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  Coins01Icon,
  GitBranchIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { PillLink } from "@/components/ui/pill-link";
import { anchor, sections } from "@/lib/routes";
import { PanelBackdrop } from "./panel-backdrop";

const proofs = [
  {
    title: "Funded first",
    body: "Rewards sit in escrow before a campaign opens, so no sale is promised more than the pool holds.",
    icon: Coins01Icon,
    tone: "lime",
    href: anchor(sections.settlement),
  },
  {
    title: "Split by policy",
    body: "One sale, four contributors, 50 / 25 / 15 / 10. The preview matches the contract to the last unit.",
    icon: GitBranchIcon,
    tone: "lilac",
    href: anchor(sections.settlement),
  },
  {
    title: "Settled, then counted",
    body: "Only finalized, non-refunded sales reach a public profile. A refund cancels pending commission.",
    icon: CheckmarkBadge01Icon,
    tone: "sky",
    href: anchor(sections.reputation),
  },
] as const;

export function Proof() {
  return (
    <section id={sections.howItWorks} className="bg-section scroll-mt-20 px-5 py-20 xl:px-0">
      <div className="mx-auto flex max-w-[1160px] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="font-display max-w-[600px] text-[36px] leading-[1.2] font-medium lg:text-h2">
          Built to be checked.{" "}
          <span className="text-faint">Every number traces back to a transaction.</span>
        </h2>
        <div className="shrink-0">
          <PillLink href={anchor(sections.settlement)} size="lg">
            See the settlement rules
          </PillLink>
        </div>
      </div>
      <div className="bg-pill mx-auto mt-10 grid max-w-[1160px] gap-2 rounded-[32px] p-2 md:grid-cols-3">
        {proofs.map((proof) => (
          <Link
            key={proof.title}
            href={proof.href}
            className="group bg-section relative flex h-[300px] flex-col justify-between overflow-hidden rounded-3xl p-6 md:h-[430px]"
          >
            <div className="ease-card absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
              <PanelBackdrop tone={proof.tone} />
            </div>
            <div className="relative flex items-center justify-between">
              <p className="font-display flex items-center gap-2 text-[26px] font-bold tracking-[-0.02em]">
                <HugeiconsIcon icon={proof.icon} size={28} aria-hidden="true" />
                {proof.title}
              </p>
              <span className="bg-ink text-soft ease-card flex size-6 items-center justify-center rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              </span>
            </div>
            <p className="text-faint group-hover:text-ink group-focus-visible:text-ink ease-card relative text-lg transition-colors duration-300 lg:text-lead">
              {proof.body}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
