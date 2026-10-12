import Link from "next/link";
import { ProductPage, PageLink } from "@/components/product/page";
import { Card } from "@/components/ui/card";

const pages: Record<string, { title: string; paragraphs: string[] }> = {
  "how-it-works": {
    title: "How Spoke works",
    paragraphs: [
      "A merchant publishes a product and puts a separate token budget behind its referral rewards. Distributors create links with immutable ancestry. A buyer sees the price, policy and eligible paid path before signing a purchase.",
      "A purchase reserves its rewards during a hold. A merchant can refund in full before the hold ends. After the hold, anyone can finalize the sale. Merchants claim proceeds and distributors claim rewards independently.",
      "The purchase snapshots its policy. New terms apply only to future purchases after at least 24 hours’ notice. Public receipts let you inspect the settlement evidence.",
    ],
  },
  trust: {
    title: "Inspect the evidence",
    paragraphs: [
      "The settlement contract accounts for buyer escrow, merchant proceeds and distributor rewards separately. The activity index powers lists and charts; it does not decide who owns the money.",
      "Inspect contract source verification, transaction hashes and public receipts before relying on a sale. A transaction hash is a submission, not a guarantee that a transaction succeeded.",
      "Public profiles are opt-in. Pseudonymous profiles omit addresses, names and receipt evidence. An attribution path describes referral ancestry and does not prove causal influence.",
    ],
  },
  pricing: {
    title: "Testnet pricing",
    paragraphs: [
      "Spoke is currently a testnet product. MON pays network fees. SDUSD and all other displayed demo settlement tokens have no cash value.",
      "Merchants choose the reward budget and terms for each campaign. A buyer sees the full token price before signing. Rewards are funded separately from the buyer’s payment.",
      "There is no enabled paid subscription checkout or published production fee schedule.",
    ],
  },
  support: {
    title: "Get help with a transaction",
    paragraphs: [
      "Keep your transaction hash, sale number, chain and request ID when reporting an issue. Never share a recovery phrase, passkey export or private key.",
      "Check service status for indexing delays. A confirmed onchain sale may appear in lists after the activity index catches up. Product access checks the chain directly.",
      "Merchant refund rights end when the purchase hold ends. Product delivery and merchant terms appear on the campaign and purchase pages.",
    ],
  },
  terms: {
    title: "Testnet terms",
    paragraphs: [
      "Spoke is provided for testnet evaluation. Testnet tokens have no cash value, and simulated Demo actions have no onchain effect. Do not pay real money based on a displayed testnet offer.",
      "You control your account and signing credentials. Review the network, token, recipient and amount before signing. Onchain transactions may be irreversible.",
      "A merchant is responsible for the product, its description, delivery and applicable terms. Spoke’s referral attribution and settlement evidence do not certify product quality or guarantee earnings.",
    ],
  },
  privacy: {
    title: "Privacy choices",
    paragraphs: [
      "Account and delivery information is restricted to authenticated users with the required ownership or role. Chain addresses and transactions remain publicly visible on the underlying network.",
      "Distributor profiles start private. You can choose pseudonymous or public visibility and explicitly select the statistics to publish. Refund adjustment accompanies any published settlement statistics.",
      "Passkey signing material and recovery phrases are derived on your device. Signing sessions end on reload, sign-out, inactivity or their maximum duration. Never submit a recovery phrase to a support form.",
    ],
  },
  disclosures: {
    title: "Disclosures",
    paragraphs: [
      "Live currently means Monad testnet. MON pays gas; SDUSD is a demo settlement token with no cash value. Demo mode is a separate simulation on your device.",
      "Referral links can pay distributors. A distributor should disclose that the merchant may reward a purchase through their link. A referral does not change the displayed buyer price.",
      "Only finalized, non-refunded sales count toward settled records. Wallet context describes supported public mainnets and does not determine Spoke rewards, ranking or contract decisions.",
      "The activity index may lag the chain. A submission, a confirmation and a completed settlement are separate events. Always inspect the final receipt and transaction outcome.",
    ],
  },
  "merchant-agreement": {
    title: "Merchant responsibilities",
    paragraphs: [
      "Provide an accurate product description, complete delivery instructions and terms before publishing a campaign. You are responsible for fulfilling purchases and responding to your buyers.",
      "Rewards use your separately funded campaign budget. Purchases reserve rewards during their hold; unused funds can be withdrawn only when a campaign is paused or ended. Reserved liabilities remain protected.",
      "Refunds are full refunds available before the hold ends. New policy versions require at least 24 hours’ notice and affect future purchases only. Never promise that an existing purchase’s terms can be changed.",
    ],
  },
  labs: {
    title: "Spoke Labs",
    paragraphs: [
      "The enabled testnet journey covers campaign budgets, referral ancestry, purchase receipts and settlement. Additional integrations and experiments are not enabled product guarantees.",
    ],
  },
  maintenance: {
    title: "Service availability",
    paragraphs: [
      "Check current API, chain and activity index health before retrying a transaction. Keep the original transaction hash and order key when checking an uncertain outcome.",
    ],
  },
};

export function InformationPage({ section }: { section: string }) {
  const page = pages[section] ?? pages.disclosures;
  if (!page) return null;
  return (
    <ProductPage title={page.title}>
      <Card className="max-w-3xl space-y-5">
        {page.paragraphs.map((paragraph) => (
          <p className="text-body leading-relaxed" key={paragraph}>
            {paragraph}
          </p>
        ))}
        <div className="flex flex-wrap gap-2 pt-3">
          <PageLink href="/explore">Browse campaigns</PageLink>
          <PageLink href="/developers/contracts">Inspect contracts</PageLink>
          <PageLink href="/status">Service status</PageLink>
        </div>
        <p className="text-subtle text-sm">
          <Link href="/legal/disclosures" className="underline">
            Disclosures
          </Link>{" "}
          ·{" "}
          <Link href="/legal/privacy" className="underline">
            Privacy
          </Link>
        </p>
      </Card>
    </ProductPage>
  );
}
