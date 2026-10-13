import type { CampaignDetail, ClientOutput, CommissionPolicy } from "@spoke/protocol";
import Link from "next/link";
import type { ReactNode } from "react";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { fill } from "@/lib/copy";
import {
  formatAmount,
  formatBps,
  formatCountdown,
  formatDateTime,
  formatSplit,
  pluralize,
  type TokenLike,
} from "@/lib/format";
import { routes } from "@/lib/routes";
import { campaignCopy } from "../copy/campaign";
import { disclosureCopy } from "../copy/disclosures";
import { termsCopy } from "../copy/terms";
import { Collapsible } from "../shared/collapsible";

type Policy = ClientOutput<"campaigns.policy">;
type Compared = keyof typeof termsCopy.compare;

const comparedValue = (key: Compared, policy: CommissionPolicy, token: TokenLike): string => {
  if (key === "commissionBps") return formatBps(policy.commissionBps);
  if (key === "perSaleCap") return formatAmount(BigInt(policy.perSaleCap), token);
  if (key === "campaignLiabilityCap")
    return formatAmount(BigInt(policy.campaignLiabilityCap), token);
  if (key === "maxRewardedAncestors") return String(policy.maxRewardedAncestors);
  if (key === "weightsBps") return formatSplit(policy.weightsBps);
  if (key === "shortPathMode") return termsCopy.shortPathModes[policy.shortPathMode];
  return formatCountdown(policy.holdSeconds);
};

const comparedKeys = Object.keys(termsCopy.compare).filter(
  (key): key is Compared => key in termsCopy.compare,
);

function Comparison({ policy, token }: { policy: Policy; token: TokenLike }) {
  const next = policy.scheduled;
  if (!next) return null;
  const date = formatDateTime(new Date(next.effectiveAt));
  const changed = comparedKeys.filter(
    (key) => comparedValue(key, policy.current, token) !== comparedValue(key, next, token),
  );
  return (
    <div className="mt-3 flex flex-col gap-3">
      <p className="text-ink font-medium">{fill(termsCopy.scheduled, { date })}</p>
      {changed.length > 0 ? (
        <Table caption={fill(termsCopy.scheduled, { date })}>
          <THead>
            <tr>
              <Th />
              <Th>{termsCopy.now}</Th>
              <Th>{fill(termsCopy.from, { date })}</Th>
            </tr>
          </THead>
          <TBody>
            {changed.map((key) => (
              <Tr key={key}>
                <Td className="text-subtle">{termsCopy.compare[key]}</Td>
                <Td className="font-mono tabular-nums">
                  {comparedValue(key, policy.current, token)}
                </Td>
                <Td className="font-mono tabular-nums">{comparedValue(key, next, token)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      ) : null}
      <p>{termsCopy.keepToday}</p>
    </div>
  );
}

function Row({
  title,
  open = false,
  children,
}: {
  title: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="border-hairline border-t first:border-t-0">
      <Collapsible title={title} level="row" defaultOpen={open}>
        <div className="text-body flex flex-col gap-2 text-sm">{children}</div>
      </Collapsible>
    </div>
  );
}

export function TermsSection({ campaign, policy }: { campaign: CampaignDetail; policy: Policy }) {
  const current = policy.current;
  const token = campaign.token;
  const merchant = campaign.merchant.name;
  const people = pluralize(current.maxRewardedAncestors, "person", "people");
  const rows: readonly [keyof typeof termsCopy.rows, ReactNode][] = [
    [
      "product",
      fill(termsCopy.product, {
        title: campaign.product.title,
        merchant,
        delivery: campaignCopy.about.delivery[campaign.product.fulfillmentMode].toLowerCase(),
      }),
    ],
    ["whoCanBuy", termsCopy.whoCanBuy],
    [
      "regions",
      current.regions.length
        ? fill(termsCopy.regions, { regions: current.regions.join(", ") })
        : termsCopy.noRegions,
    ],
    [
      "commission",
      fill(termsCopy.commission, {
        rate: formatBps(current.commissionBps),
        bps: String(current.commissionBps),
      }),
    ],
    [
      "perSaleCap",
      fill(termsCopy.perSaleCap, { cap: formatAmount(BigInt(current.perSaleCap), token) }),
    ],
    [
      "campaignCap",
      fill(termsCopy.campaignCap, {
        cap: formatAmount(BigInt(current.campaignLiabilityCap), token),
      }),
    ],
    [
      "whoGetsPaid",
      fill(termsCopy.whoGetsPaid, { people, weights: formatSplit(current.weightsBps) }),
    ],
    [
      "shortPaths",
      fill(
        current.shortPathMode === "RENORMALIZE_EXISTING"
          ? termsCopy.renormalize
          : termsCopy.returnUnused,
        { count: String(current.maxRewardedAncestors) },
      ),
    ],
    ["hold", fill(termsCopy.hold, { hold: formatCountdown(current.holdSeconds) })],
    ["refunds", fill(termsCopy.refunds, { policy: campaign.product.refundPolicy })],
    ["chargebacks", termsCopy.chargebacks],
    ["token", fill(termsCopy.token, { symbol: token.symbol })],
    ["claims", termsCopy.claims],
    ["exclusions", termsCopy.exclusions],
    [
      "sharing",
      <>
        <p>{disclosureCopy.sharingRules}</p>
        {current.sharingRules.length > 0 ? (
          <>
            <p>{fill(termsCopy.merchantRules, { merchant })}</p>
            <ul className="list-disc pl-5">
              {current.sharingRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </>
        ) : null}
      </>,
    ],
    ["privacy", termsCopy.privacy],
    ["disputes", fill(termsCopy.disputes, { merchant })],
    [
      "changes",
      <>
        <p>{fill(termsCopy.changes, { merchant })}</p>
        <Comparison policy={policy} token={token} />
      </>,
    ],
    ["expiry", fill(termsCopy.expiry, { date: formatDateTime(new Date(campaign.endsAt)) })],
  ];
  return (
    <section
      id="terms"
      className="bg-surface border-hairline scroll-mt-24 rounded-2xl border px-6 pt-6 pb-3 lg:px-8 lg:pt-8"
    >
      <h2 className="font-display text-h4 text-ink mb-2 font-medium">{termsCopy.heading}</h2>
      {rows.map(([key, body]) => (
        <Row
          key={key}
          title={termsCopy.rows[key]}
          open={key === "changes" && policy.scheduled !== null}
        >
          {typeof body === "string" ? <p>{body}</p> : body}
        </Row>
      ))}
      <div className="border-hairline border-t py-3.5">
        <Link
          href={routes.legal.merchantAgreement}
          className="text-ink text-sm underline underline-offset-2"
        >
          {termsCopy.agreement}
        </Link>
      </div>
    </section>
  );
}
