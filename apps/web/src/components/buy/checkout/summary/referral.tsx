import { Avatar } from "@/components/ui/avatar";
import { fill } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { checkoutCopy } from "../../copy/checkout";

export function ReferralBlock({
  referrer,
  seed,
  rememberedAt,
  compact,
  onNotThisPerson,
}: {
  referrer: string | null;
  seed: string;
  rememberedAt: number | null;
  compact: boolean;
  onNotThisPerson: (() => void) | null;
}) {
  if (!referrer)
    return (
      <section className="bg-lilac-soft rounded-2xl p-4 sm:p-5">
        <p className="text-ink text-sm sm:text-base">{checkoutCopy.noReferral}</p>
      </section>
    );
  return (
    <section className="bg-lilac-soft flex gap-3 rounded-2xl p-4 sm:p-5">
      <Avatar seed={seed} name={referrer.replace(/^@/, "")} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {compact ? (
          <p className="text-ink text-sm">{fill(checkoutCopy.referredShort, { referrer })}</p>
        ) : (
          <>
            <p className="text-ink font-medium">{fill(checkoutCopy.referredBy, { referrer })}</p>
            <p className="text-body text-sm">
              {fill(checkoutCopy.referredDisclosure, { referrer })}
            </p>
          </>
        )}
        {rememberedAt !== null ? (
          <p className="text-subtle text-sm">
            {fill(checkoutCopy.remembered, { date: formatDateTime(new Date(rememberedAt)) })}
          </p>
        ) : null}
        {onNotThisPerson ? (
          <button
            type="button"
            onClick={onNotThisPerson}
            className="text-lilac-deep hover:text-ink self-start text-sm underline underline-offset-2 transition-colors"
          >
            {checkoutCopy.notFromThisPerson}
          </button>
        ) : null}
      </div>
    </section>
  );
}
