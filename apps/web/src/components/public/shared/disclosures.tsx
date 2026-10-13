import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { disclosureCopy } from "../copy/disclosures";

export function Disclosures({ lines }: { lines: readonly string[] }) {
  return (
    <section
      aria-label={disclosureCopy.heading}
      className="bg-soft border-hairline flex flex-col gap-2.5 rounded-2xl border p-5"
    >
      <h2 className="text-ink flex items-center gap-2 text-sm font-medium">
        <HugeiconsIcon
          icon={InformationCircleIcon}
          size={16}
          strokeWidth={1.8}
          aria-hidden="true"
        />
        {disclosureCopy.heading}
      </h2>
      {lines.map((line) => (
        <p key={line} className="text-subtle text-sm">
          {line}
        </p>
      ))}
    </section>
  );
}
