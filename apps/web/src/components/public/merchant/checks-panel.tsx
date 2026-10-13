import {
  CheckmarkCircle02Icon,
  HelpCircleIcon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons";
import type { ClientOutput } from "@spoke/protocol";
import type { IconSvgElement } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { fill, globalStates } from "@/lib/copy";
import { shortAddress } from "@/lib/format";
import { merchantCopy } from "../copy/merchant";

type Merchant = ClientOutput<"merchants.get">;

type Check = {
  key: string;
  title: string;
  body: string;
  passed: boolean;
  sample: boolean;
  icon: IconSvgElement;
};

export function ChecksPanel({ merchant, demo }: { merchant: Merchant; demo: boolean }) {
  const tier = merchant.verificationTier;
  const checks: Check[] = [
    {
      key: "wallet",
      title: merchantCopy.walletSigned,
      body: fill(merchantCopy.walletSignedBody, {
        name: merchant.name,
        wallet: shortAddress(merchant.address),
      }),
      passed: true,
      sample: false,
      icon: SecurityCheckIcon,
    },
    {
      key: "identity",
      title: merchantCopy.identity,
      body: merchantCopy.identityBody,
      passed: false,
      sample: false,
      icon: HelpCircleIcon,
    },
    ...(demo
      ? [
          {
            key: "domain",
            title: merchantCopy.domain,
            body: merchantCopy.domainBody,
            passed: tier === "domain" || tier === "business",
            sample: true,
            icon: CheckmarkCircle02Icon,
          },
          {
            key: "business",
            title: merchantCopy.business,
            body: merchantCopy.businessBody,
            passed: tier === "business",
            sample: true,
            icon: CheckmarkCircle02Icon,
          },
        ]
      : []),
  ];
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-display text-h4 text-ink font-medium">{merchantCopy.checks}</h2>
      <ul className="divide-hairline flex flex-col divide-y">
        {checks.map((check) => (
          <li
            key={check.key}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4"
          >
            <div className="flex items-center gap-2 sm:w-56 sm:shrink-0">
              <span className="text-ink font-medium">{check.title}</span>
              {check.sample ? <Badge>{globalStates.demoMode.sampleLabel}</Badge> : null}
            </div>
            <p className="text-body flex-1 text-sm">{check.body}</p>
            <StatusChip
              label={check.passed ? merchantCopy.passed : merchantCopy.notVerified}
              icon={check.passed ? CheckmarkCircle02Icon : check.icon}
              tone={check.passed ? "lime" : "faint"}
              className="self-start"
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
