import { CheckmarkBadge01Icon, Coins01Icon, GitBranchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PillLink } from "@/components/ui/pill-link";
import { anchor, sections } from "@/lib/routes";
import { PanelBackdrop } from "./panel-backdrop";

const proofs = [
  {
    title: "Funded first",
    body: "Rewards sit in escrow before a campaign opens, so no sale is promised more than the pool holds.",
    icon: Coins01Icon,
    tone: "lime",
  },
  {
    title: "Split by policy",
    body: "One sale, four contributors, 50 / 25 / 15 / 10. The preview matches the contract to the last unit.",
    icon: GitBranchIcon,
    tone: "lilac",
  },
  {
    title: "Settled, then counted",
    body: "Only finalized, non-refunded sales reach a public profile. A refund cancels pending commission.",
    icon: CheckmarkBadge01Icon,
    tone: "sky",
  },
] as const;

export function Proof() {
  return (
    <section id={sections.howItWorks} className="bg-section scroll-mt-20 px-5 py-20 xl:px-0">
      <div className="mx-auto flex max-w-[1160px] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="reveal font-display max-w-[600px] text-[36px] leading-[1.2] font-medium lg:text-h2">
          Built to be checked.{" "}
          <span className="text-faint">Every number traces back to a transaction.</span>
        </h2>
        <div className="shrink-0">
          <PillLink href={anchor(sections.settlement)} size="lg">
            See the settlement rules
          </PillLink>
        </div>
      </div>
      <div className="reveal bg-pill mx-auto mt-10 grid max-w-[1160px] gap-2 rounded-[32px] p-2 md:grid-cols-3">
        {proofs.map((proof) => (
          <article
            key={proof.title}
            className="group bg-section relative flex h-[300px] flex-col justify-between overflow-hidden rounded-3xl p-6 md:h-[430px]"
          >
            <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              <PanelBackdrop tone={proof.tone} />
            </div>
            <p className="font-display relative flex items-center gap-2 text-[26px] font-bold tracking-[-0.02em]">
              <HugeiconsIcon icon={proof.icon} size={28} aria-hidden="true" />
              {proof.title}
            </p>
            <p className="text-faint group-hover:text-ink relative text-lg transition-colors duration-500 lg:text-lead">
              {proof.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
