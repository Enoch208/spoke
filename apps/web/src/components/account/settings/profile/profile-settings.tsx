"use client";

import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { QueryState } from "@/components/product/page";
import { isClientError } from "@/lib/client/errors";
import { fill } from "@/lib/copy";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useNow } from "@/lib/use-now";
import { useUiStore } from "@/lib/stores/ui";
import { profileCopy } from "../../copy/profile";
import { settingsCopy } from "../../copy/settings";
import { formatDay } from "../../shared/dates";
import { handleBlocks, useHandleCheck } from "../../shared/use-handle-check";
import { useLeaveGuard } from "../leave-guard";
import { SaveBar } from "../save-bar";
import { SettingsCardSkeleton } from "../settings-card";
import { ProfileForm } from "./profile-form";
import { profileErrors, sameValues, updateOf, valuesOf, type ProfileValues } from "./profile-model";
import { ProfilePreview } from "./profile-preview";

type Me = ClientOutput<"account.me">;

const suggestionsSchema = z.object({ suggestions: z.array(z.string()) });

export function ProfileSettings() {
  const me = useClientQuery("account.me", {});
  return (
    <QueryState pending={false} error={me.error} retry={() => void me.refetch()}>
      {me.data ? (
        <ProfileEditor key={me.data.address} me={me.data} />
      ) : (
        <>
          <SettingsCardSkeleton rows={5} />
          <SettingsCardSkeleton rows={2} />
        </>
      )}
    </QueryState>
  );
}

function ProfileEditor({ me }: { me: Me }) {
  const record = useClientQuery("reputation.mine", {});
  const update = useClientMutation("account.updateProfile", ["account.me", "reputation"]);
  const now = useNow();
  const [base, setBase] = useState<ProfileValues>(() => valuesOf(me));
  const [values, setValues] = useState<ProfileValues>(base);
  const [race, setRace] = useState<readonly string[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const check = useHandleCheck(values.handle, me.handle);
  const errors = profileErrors(values, me);
  const dirty = !sameValues(values, base);
  useLeaveGuard(dirty, profileCopy.leaveSubject);
  const lockedUntil = me.handleChangeAvailableAt ? Date.parse(me.handleChangeAvailableAt) : null;
  const handleLocked =
    lockedUntil !== null && lockedUntil > now && me.handleChangedAt
      ? fill(profileCopy.handleTooSoon, {
          date: formatDay(new Date(me.handleChangedAt)),
          next: formatDay(new Date(lockedUntil)),
        })
      : null;
  const handleChanged = values.handle !== (me.handle ?? "");
  const blocked =
    Object.keys(errors).length > 0 ||
    (handleChanged && values.handle !== "" && handleBlocks(check));

  const save = async () => {
    setSaveError(null);
    setRace(null);
    try {
      const saved = await update.mutateAsync(updateOf(values, me));
      const next = valuesOf(saved);
      setBase(next);
      setValues(next);
      useUiStore.getState().pushToast({
        id: "T-02",
        tone: "success",
        message: profileCopy.saved,
        durationMs: 3000,
      });
    } catch (failure) {
      if (isClientError(failure) && failure.code === "HANDLE_TAKEN") {
        const parsed = suggestionsSchema.safeParse(failure.details);
        setRace(parsed.success ? parsed.data.suggestions : []);
        return;
      }
      setSaveError(isClientError(failure) ? failure.message : settingsCopy.saveBar.failed);
    }
  };

  return (
    <>
      <ProfileForm
        values={values}
        errors={errors}
        onChange={(patch) => {
          if (patch.handle !== undefined) setRace(null);
          setValues((current) => ({ ...current, ...patch }));
        }}
        check={check}
        race={race}
        avatarBase={me.address.toLowerCase()}
        currentHandle={me.handle}
        handleLocked={handleLocked}
      />
      <ProfilePreview values={values} visibility={record.data?.visibility ?? null} />
      {me.isMerchant ? (
        <p className="text-body px-1 text-sm">
          {profileCopy.business}{" "}
          <Link
            href={routes.sell.settings}
            className="text-ink font-medium underline-offset-2 hover:underline"
          >
            {profileCopy.businessLink}
          </Link>
        </p>
      ) : null}
      <SaveBar
        visible={dirty}
        saving={update.isPending}
        error={saveError}
        canSave={!blocked}
        onDiscard={() => {
          setValues(base);
          setRace(null);
          setSaveError(null);
        }}
        onSave={() => void save()}
      />
    </>
  );
}
