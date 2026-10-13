"use client";

import { LegacySettings } from "../settings-page";
import { ProfileSettings } from "./profile/profile-settings";
import type { SettingsSection } from "./sections";
import { SettingsFrame } from "./settings-frame";

export function SettingsView({ section }: { section: SettingsSection }) {
  return (
    <SettingsFrame section={section}>
      {section === "profile" ? <ProfileSettings /> : <LegacySettings section={section} />}
    </SettingsFrame>
  );
}
