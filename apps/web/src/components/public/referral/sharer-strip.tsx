import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { fill } from "@/lib/copy";
import { routeTo } from "@/lib/routes";
import { actionCopy } from "../copy/availability";
import { referralCopy } from "../copy/referral";
import { actorProfileHandle, type PublicActor } from "../shared/actor";

export function SharerStrip({
  owner,
  sharer,
  ownLink,
}: {
  owner: PublicActor;
  sharer: string;
  ownLink: boolean;
}) {
  const handle = actorProfileHandle(owner);
  const name = handle ? (
    <Link href={routeTo.profile(handle)} className="underline-offset-2 hover:underline">
      {sharer}
    </Link>
  ) : (
    sharer
  );
  return (
    <div className="bg-pill flex items-start gap-3 rounded-3xl px-4 py-3.5 sm:px-5">
      <Avatar seed={owner.handle ?? sharer} name={ownLink ? null : sharer} size="md" />
      <div className="flex min-w-0 flex-col gap-0.5 text-sm">
        {ownLink ? (
          <p className="text-ink font-medium">{actionCopy.ownLinkStrip}</p>
        ) : (
          <>
            <p className="text-ink text-base font-medium">
              {name} {referralCopy.sharedSuffix}
            </p>
            <p className="text-body">{fill(referralCopy.sameprice, { sharer })}</p>
          </>
        )}
      </div>
    </div>
  );
}
