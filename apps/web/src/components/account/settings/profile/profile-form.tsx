"use client";

import { cx } from "@/components/ui/cx";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fill } from "@/lib/copy";
import { profileCopy } from "../../copy/profile";
import { sharedFormCopy } from "../../copy/forms";
import { AvatarPicker } from "../../shared/avatar-picker";
import { HandleField } from "../../shared/handle-field";
import type { HandleCheck } from "../../shared/use-handle-check";
import { SettingsCard } from "../settings-card";
import { bioLimit, type ProfileErrors, type ProfileValues } from "./profile-model";

export function ProfileForm({
  values,
  errors,
  onChange,
  check,
  race,
  avatarBase,
  currentHandle,
  handleLocked,
}: {
  values: ProfileValues;
  errors: ProfileErrors;
  onChange: (patch: Partial<ProfileValues>) => void;
  check: HandleCheck;
  race: readonly string[] | null;
  avatarBase: string;
  currentHandle: string | null;
  handleLocked: string | null;
}) {
  const handleChanged =
    currentHandle !== null && values.handle !== "" && values.handle !== currentHandle;
  return (
    <SettingsCard title={profileCopy.cardTitle} description={profileCopy.cardDescription}>
      <Field label={sharedFormCopy.displayName.label} optional error={errors.displayName}>
        <Input
          value={values.displayName}
          placeholder={sharedFormCopy.displayName.placeholder}
          maxLength={60}
          autoComplete="name"
          onChange={(event) => {
            onChange({ displayName: event.target.value });
          }}
        />
      </Field>
      <HandleField
        value={values.handle}
        onChange={(handle) => {
          onChange({ handle });
        }}
        check={errors.handle ? { kind: "empty" } : check}
        race={race}
        disabled={handleLocked !== null}
        helper={handleLocked ?? profileCopy.handleHelp}
        extra={
          <>
            {errors.handle ? <p className="text-pink-ink text-sm">{errors.handle}</p> : null}
            {handleChanged && check.kind === "available" ? (
              <p className="bg-sky-soft text-sky-ink rounded-xl px-3 py-2 text-sm">
                {fill(profileCopy.handleChangeNote, { old: currentHandle, new: values.handle })}
              </p>
            ) : null}
          </>
        }
      />
      <div className="flex flex-col gap-1.5">
        <p className="text-ink text-sm font-medium">{sharedFormCopy.avatar.label}</p>
        <AvatarPicker
          base={avatarBase}
          value={values.avatarSeed}
          onChange={(avatarSeed) => {
            onChange({ avatarSeed });
          }}
        />
        <p className="text-subtle text-sm">{sharedFormCopy.avatar.helper}</p>
      </div>
      <Field
        label={profileCopy.bio.label}
        optional
        error={errors.bio}
        helper={
          <span className={cx(values.bio.length > bioLimit && "text-pink-ink font-medium")}>
            {fill(profileCopy.bio.counter, { n: String(values.bio.length) })}
          </span>
        }
      >
        <Textarea
          value={values.bio}
          rows={3}
          placeholder={profileCopy.bio.placeholder}
          onChange={(event) => {
            onChange({ bio: event.target.value });
          }}
        />
      </Field>
      <Field label={profileCopy.website.label} optional error={errors.website}>
        <Input
          value={values.website}
          type="url"
          inputMode="url"
          placeholder={profileCopy.website.placeholder}
          maxLength={120}
          onChange={(event) => {
            onChange({ website: event.target.value });
          }}
        />
      </Field>
    </SettingsCard>
  );
}
