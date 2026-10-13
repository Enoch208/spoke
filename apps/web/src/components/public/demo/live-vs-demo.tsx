import { CheckmarkCircle02Icon, TestTube01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { featureNames } from "@/lib/copy";
import { featureKeys, featureStatus, type FeatureStatus } from "@/lib/features";
import { routes } from "@/lib/routes";
import { demoPageCopy } from "./demo-copy";

const namesFor = (status: FeatureStatus) =>
  featureKeys
    .filter((key) => featureStatus(key) === status)
    .map((key) => featureNames[key])
    .sort((a, b) => a.localeCompare(b));

function Column({
  title,
  icon,
  names,
}: {
  title: string;
  icon: IconSvgElement;
  names: readonly string[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-ink flex items-center gap-2 text-base font-medium">
        <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} aria-hidden="true" />
        {title}
      </h3>
      <ul className="text-body columns-2 gap-x-4 text-sm [&>li]:mb-1.5">
        {names.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  );
}

export function LiveVsDemo() {
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-h4 text-ink font-medium">{demoPageCopy.compareHeading}</h2>
        <p className="text-subtle text-sm">{demoPageCopy.compareBody}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Column
          title={demoPageCopy.liveColumn}
          icon={CheckmarkCircle02Icon}
          names={namesFor("live")}
        />
        <Column
          title={demoPageCopy.demoColumn}
          icon={TestTube01Icon}
          names={namesFor("demo-only")}
        />
      </div>
      <Link href={routes.labs} className="text-ink w-fit text-sm underline underline-offset-2">
        {demoPageCopy.whatsComing}
      </Link>
    </Card>
  );
}
