import type { ClientInput, ClientOutput } from "@spoke/protocol";
import { profileCopy } from "../../copy/profile";
import { sharedFormCopy } from "../../copy/forms";

type Me = ClientOutput<"account.me">;

export type ProfileValues = {
  displayName: string;
  handle: string;
  avatarSeed: string;
  bio: string;
  website: string;
};

export type ProfileErrors = Partial<Record<keyof ProfileValues, string>>;

export const bioLimit = 160;

export const valuesOf = (me: Me): ProfileValues => ({
  displayName: me.displayName,
  handle: me.handle ?? "",
  avatarSeed: me.avatarSeed,
  bio: me.bio,
  website: me.website ?? "",
});

export const sameValues = (a: ProfileValues, b: ProfileValues) =>
  a.displayName === b.displayName &&
  a.handle === b.handle &&
  a.avatarSeed === b.avatarSeed &&
  a.bio === b.bio &&
  a.website === b.website;

const httpsUrl = (value: string) => {
  if (!URL.canParse(value)) return false;
  return new URL(value).protocol === "https:";
};

export const profileErrors = (values: ProfileValues, current: Me): ProfileErrors => {
  const errors: ProfileErrors = {};
  const name = values.displayName.trim();
  if (name.length > 40) errors.displayName = sharedFormCopy.displayName.tooLong;
  else if (/https?:\/\/|www\./i.test(name)) errors.displayName = sharedFormCopy.displayName.noUrls;
  if (current.handle !== null && values.handle === "") errors.handle = profileCopy.handleKeep;
  if (values.bio.length > bioLimit) errors.bio = profileCopy.bio.tooLong;
  const website = values.website.trim();
  if (website.length > 100) errors.website = profileCopy.website.tooLong;
  else if (website !== "" && !httpsUrl(website)) errors.website = profileCopy.website.invalid;
  return errors;
};

export const updateOf = (
  values: ProfileValues,
  current: Me,
): ClientInput<"account.updateProfile"> => {
  const website = values.website.trim();
  const handleChanged = values.handle !== "" && values.handle !== (current.handle ?? "");
  return {
    displayName: values.displayName.trim(),
    avatarSeed: values.avatarSeed,
    bio: values.bio.trim(),
    website: website === "" ? null : website,
    ...(handleChanged ? { handle: values.handle } : {}),
  };
};
