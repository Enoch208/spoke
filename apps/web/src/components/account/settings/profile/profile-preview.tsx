import Link from "next/link";
import { fill } from "@/lib/copy";
import { formatHandle } from "@/lib/format";
import { routes } from "@/lib/routes";
import { profileCopy } from "../../copy/profile";
import { PieceAvatar } from "../../shared/piece-avatar";
import { SettingsCard } from "../settings-card";
import type { ProfileValues } from "./profile-model";

type Visibility = "public" | "pseudonymous" | "private";

const copy = profileCopy.preview;

export function ProfilePreview({
  values,
  visibility,
}: {
  values: ProfileValues;
  visibility: Visibility | null;
}) {
  const handle = values.handle ? formatHandle(values.handle) : null;
  const name = values.displayName.trim();
  const showName = visibility !== "pseudonymous" && name !== "";
  return (
    <SettingsCard title={copy.title} description={copy.description}>
      <div className="flex flex-col gap-2">
        <p className="text-subtle text-sm">{copy.onLinks}</p>
        <div className="bg-soft flex items-center gap-3 rounded-xl px-4 py-3">
          <PieceAvatar seed={values.avatarSeed} size="sm" />
          <p className="text-ink text-sm">
            {fill(copy.sharedBy, { name: handle ?? (name || copy.unnamed) })}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-subtle text-sm">{copy.onProfile}</p>
        <div className="border-hairline overflow-hidden rounded-xl border">
          <div className="from-lilac-soft to-pink-soft h-14 bg-gradient-to-r" />
          <div className="-mt-7 flex flex-col gap-2 px-4 pb-4">
            <PieceAvatar seed={values.avatarSeed} size="lg" className="ring-surface ring-4" />
            <div className="min-w-0">
              <p className="font-display text-ink text-lead font-medium">
                {showName ? name : (handle ?? copy.unnamed)}
              </p>
              {showName && handle ? <p className="text-subtle text-sm">{handle}</p> : null}
            </div>
            {visibility !== "pseudonymous" && values.bio.trim() ? (
              <p className="text-body text-sm break-words">{values.bio.trim()}</p>
            ) : null}
            {visibility === "pseudonymous" ? (
              <p className="text-subtle text-sm">{copy.pseudonymousNote}</p>
            ) : null}
          </div>
        </div>
      </div>
      {visibility ? (
        <p className="text-body flex flex-wrap items-center gap-x-2 text-sm">
          {fill(copy.visibility, { level: copy.levels[visibility] })}
          <span aria-hidden="true" className="text-faint">
            ·
          </span>
          <Link
            href={routes.settings.privacy}
            className="text-ink font-medium underline-offset-2 hover:underline"
          >
            {copy.change}
          </Link>
        </p>
      ) : null}
    </SettingsCard>
  );
}
