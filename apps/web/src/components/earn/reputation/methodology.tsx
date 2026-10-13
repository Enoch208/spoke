import { ArrowDown01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { fill, required } from "@/lib/copy";
import { formatDateRange } from "@/lib/format";
import { routes } from "@/lib/routes";
import { reputationCopy as copy } from "../copy/reputation";

export function Methodology({ profile }: { profile: ClientOutput<"reputation.mine"> }) {
  const { from, to } = profile.evidencePeriod;
  return (
    <details className="group bg-sky-soft rounded-2xl px-5 py-4">
      <summary className="text-sky-ink flex cursor-pointer list-none items-start justify-between gap-3">
        <span className="flex items-start gap-2">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={18}
            strokeWidth={1.8}
            aria-hidden="true"
            className="mt-0.5"
          />
          <span>
            <span className="block font-medium">{required.reputation}</span>
            <span className="text-sm">{copy.methodology.title}</span>
          </span>
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className="ease-spring mt-0.5 transition-transform duration-[423ms] group-open:rotate-180"
        />
      </summary>
      <div className="text-body mt-3 grid gap-1.5 pl-7 text-sm">
        <p>
          {fill(copy.methodology.version, {
            version: profile.methodologyVersion.replace(/^\D+/, ""),
          })}
        </p>
        <p>
          {from && to
            ? fill(copy.methodology.period, {
                range: formatDateRange(new Date(from), new Date(to)),
              })
            : copy.methodology.periodEmpty}
        </p>
        <p>{copy.methodology.counts}</p>
        <p>{copy.methodology.never}</p>
        <p>{copy.methodology.noScore}</p>
        <Link href={routes.trust} className="text-ink underline underline-offset-2">
          {copy.methodology.read}
        </Link>
      </div>
    </details>
  );
}
