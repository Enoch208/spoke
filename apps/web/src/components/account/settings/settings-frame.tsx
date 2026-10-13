"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ProductPage } from "@/components/product/page";
import { cx } from "@/components/ui/cx";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useClientQuery } from "@/lib/query/use-client";
import { settingsCopy } from "../copy/settings";
import { requestLeave } from "./leave-guard";
import { sectionIcons, settingsSections, type SettingsSection } from "./sections";

const hrefOf = (section: SettingsSection) => `/settings/${section}`;

function RecoveryDot() {
  return (
    <span className="ml-auto flex items-center">
      <span aria-hidden="true" className="bg-amber-deep size-2 rounded-full" />
      <span className="sr-only">{settingsCopy.recoveryDot}</span>
    </span>
  );
}

export function SettingsFrame({
  section,
  children,
}: {
  section: SettingsSection;
  children: ReactNode;
}) {
  const router = useRouter();
  const me = useClientQuery("account.me", {});
  const needsBackup = me.data?.accountKind === "passkey" && me.data.recovery.checkedAt === null;
  return (
    <ProductPage title={settingsCopy.title} description={settingsCopy.descriptions[section]}>
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,720px)] lg:gap-10">
        <nav aria-label={settingsCopy.sectionLabel} className="hidden lg:block">
          <ul className="sticky top-24 flex flex-col gap-0.5">
            {settingsSections.map((item) => {
              const active = item === section;
              return (
                <li key={item}>
                  <Link
                    href={hrefOf(item)}
                    {...(active ? { "aria-current": "page" as const } : {})}
                    className={cx(
                      "ease-spring flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-[423ms]",
                      active ? "bg-ink text-page" : "text-body hover:bg-pill hover:text-ink",
                    )}
                  >
                    <HugeiconsIcon
                      icon={sectionIcons[item]}
                      size={18}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    {settingsCopy.sections[item]}
                    {item === "security" && needsBackup ? <RecoveryDot /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <Field label={settingsCopy.sectionLabel} hideLabel className="lg:hidden">
          <Select
            value={section}
            onValueChange={(next) => {
              requestLeave(() => {
                router.push(hrefOf(next));
              });
            }}
            options={settingsSections.map((item) => ({
              value: item,
              label:
                item === "security" && needsBackup
                  ? `${settingsCopy.sections[item]} · ${settingsCopy.recoveryDot}`
                  : settingsCopy.sections[item],
            }))}
          />
        </Field>
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      </div>
    </ProductPage>
  );
}
