import {
  CheckListIcon,
  CheckmarkBadge01Icon,
  Coins01Icon,
  DatabaseIcon,
  HelpCircleIcon,
  Share08Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PillLink } from "@/components/ui/pill-link";
import { anchor, sections } from "@/lib/routes";

const questions = [
  {
    q: "Is this affiliate marketing with crypto payouts?",
    a: "No. Links are one entry point. The product is a multi-merchant graph with multi-hop attribution, funded settlement and a record that travels with you.",
    audience: "Everyone",
    topic: "Positioning",
    icon: Share08Icon,
    tile: "bg-lime text-olive",
  },
  {
    q: "Does it turn into a pyramid?",
    a: "No joining fees, no reward for recruiting and no unlimited payouts. Merchants pre-fund finite rewards paid only for eligible product sales.",
    audience: "Distributors",
    topic: "Economics",
    icon: Coins01Icon,
    tile: "bg-pink text-ink",
  },
  {
    q: "Are conversions really verified?",
    a: "Native checkout proves the payment onchain. External stores will use signed merchant attestations, labelled as a different level of trust.",
    audience: "Merchants",
    topic: "Verification",
    icon: CheckmarkBadge01Icon,
    tile: "bg-lilac text-ink",
  },
  {
    q: "What stops people making fake wallets?",
    a: "A real paid sale and a finite funded reward make abuse costly, and self-referral is blocked. We measure fraud rather than promise it away.",
    audience: "Merchants",
    topic: "Risk",
    icon: Shield01Icon,
    tile: "bg-olive text-lime",
  },
  {
    q: "Can a merchant change the split later?",
    a: "Not for sales already made. Terms freeze for every accepted order, and a new policy only applies from its effective time onward.",
    audience: "Distributors",
    topic: "Policy",
    icon: CheckListIcon,
    tile: "bg-sky text-ink",
  },
  {
    q: "Why build it on Monad?",
    a: "Wallet-signed links, reward reserves and settlement need a fast EVM with public events. Private order details never go onchain.",
    audience: "Developers",
    topic: "Infrastructure",
    icon: DatabaseIcon,
    tile: "bg-lime-soft text-olive",
  },
] as const;

const columns = [questions.slice(0, 2), questions.slice(2, 4), questions.slice(4, 6)];

export function Questions() {
  return (
    <section
      id={sections.faq}
      className="mx-auto mt-24 max-w-[1000px] scroll-mt-24 px-5 lg:mt-[120px] xl:px-0"
    >
      <h2 className="font-display mx-auto max-w-[780px] text-center text-[36px] leading-[1.2] font-medium text-balance lg:text-h2">
        Straight answers to the hard questions
      </h2>
      <div className="mt-10 grid gap-3 md:grid-cols-3 lg:mt-[49px]">
        {columns.map((column, index) => (
          <div
            key={column[0]?.q}
            className={`flex flex-col gap-3 lg:gap-6 ${index === 1 ? "md:-translate-y-6" : ""}`}
          >
            {column.map((item) => (
              <article
                key={item.q}
                className="reveal bg-surface relative flex flex-col justify-between gap-8 rounded-3xl px-5 pt-12 pb-5 md:min-h-[300px]"
              >
                <HugeiconsIcon
                  icon={HelpCircleIcon}
                  size={36}
                  className="text-pill absolute top-4 right-5"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="pr-10 font-medium">{item.q}</h3>
                  <p className="text-muted mt-2 text-sm">{item.a}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    <span className="block font-medium">{item.audience}</span>
                    <span className="text-subtle">{item.topic}</span>
                  </p>
                  <span
                    aria-hidden="true"
                    className={`flex size-10 items-center justify-center rounded-lg ${item.tile}`}
                  >
                    <HugeiconsIcon icon={item.icon} size={20} />
                  </span>
                </div>
              </article>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <PillLink href={anchor(sections.settlement)}>Read the settlement rules</PillLink>
      </div>
    </section>
  );
}
