import { HourglassIcon, LinkSquare02Icon, ViewOffIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/lib/routes";
import { referralCopy } from "../copy/referral";

export type DeadLink = "unknown" | "retired" | "otherChain";

const looks = {
  unknown: {
    icon: LinkSquare02Icon,
    title: referralCopy.unknownTitle,
    body: referralCopy.unknownBody,
    learn: true,
  },
  otherChain: {
    icon: HourglassIcon,
    title: referralCopy.expiredTitle,
    body: referralCopy.expiredBody,
    learn: false,
  },
  retired: {
    icon: ViewOffIcon,
    title: referralCopy.hiddenTitle,
    body: referralCopy.hiddenBody,
    learn: false,
  },
} as const;

export function DeadReferral({ status }: { status: DeadLink }) {
  const look = looks[status];
  return (
    <EmptyState
      variant="page"
      icon={look.icon}
      title={look.title}
      body={look.body}
      actions={
        <>
          <Button asChild>
            <Link href={routes.explore}>{referralCopy.exploreCampaigns}</Link>
          </Button>
          {look.learn ? (
            <Button asChild variant="secondary">
              <Link href={routes.howItWorks}>{referralCopy.whatIsSpoke}</Link>
            </Button>
          ) : null}
        </>
      }
    />
  );
}
