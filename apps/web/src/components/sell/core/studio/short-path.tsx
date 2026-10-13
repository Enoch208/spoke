"use client";

import type { CommissionPolicy } from "@spoke/protocol";
import { RadioGroup } from "@/components/ui/radio";
import { fill } from "@/lib/copy";
import { formatAmount, type TokenLike } from "@/lib/format";
import { studioCopy } from "./copy";
import { splitPreview } from "./split";
import type { ShortPathMode } from "./terms";

const copy = studioCopy.shortPath;

const example = (
  mode: ShortPathMode,
  policy: CommissionPolicy | null,
  priceMinor: bigint | null,
  token: TokenLike,
) => {
  const levels = policy?.weightsBps.length ?? 1;
  if (!policy || priceMinor === null || levels < 2) return undefined;
  const present = Math.min(2, levels - 1);
  const preview = splitPreview(priceMinor, { ...policy, shortPathMode: mode }, present);
  const values = {
    count: present === 1 ? copy.person : fill(copy.people, { count: String(present) }),
    price: formatAmount(priceMinor, token),
    split: preview.amounts.map((amount) => formatAmount(amount, token)).join(" / "),
  };
  return mode === "RENORMALIZE_EXISTING"
    ? fill(copy.renormalizeExample, values)
    : fill(copy.returnExample, { ...values, returned: formatAmount(preview.returned, token) });
};

export function ShortPathChoice({
  value,
  onChange,
  policy,
  priceMinor,
  token,
  disabled,
}: {
  value: ShortPathMode;
  onChange: (mode: ShortPathMode) => void;
  policy: CommissionPolicy | null;
  priceMinor: bigint | null;
  token: TokenLike;
  disabled?: boolean | undefined;
}) {
  return (
    <RadioGroup<ShortPathMode>
      label={copy.label}
      value={value}
      onValueChange={onChange}
      options={[
        {
          value: "RENORMALIZE_EXISTING",
          label: copy.renormalize,
          description: example("RENORMALIZE_EXISTING", policy, priceMinor, token),
          disabled: disabled ?? false,
        },
        {
          value: "RETURN_UNUSED",
          label: copy.returnUnused,
          description: example("RETURN_UNUSED", policy, priceMinor, token),
          disabled: disabled ?? false,
        },
      ]}
    />
  );
}
