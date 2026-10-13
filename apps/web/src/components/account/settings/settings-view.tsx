"use client";

import { LegacySettings } from "../settings-page";
import { ProfileSettings } from "./profile/profile-settings";
import type { SettingsSection } from "./sections";
import { SettingsFrame } from "./settings-frame";
import { SecuritySettings } from "./security/security-settings";
import { PrivacySettings } from "./privacy-settings";
import { NotificationSettings } from "./notification-settings";
import { PreferencesSettings } from "./preferences-settings";

export function SettingsView({ section }: { section: SettingsSection }) {
  return (
    <SettingsFrame section={section}>
      {section === "profile" ? (
        <ProfileSettings />
      ) : section === "security" ? (
        <SecuritySettings />
      ) : section === "privacy" ? (
        <PrivacySettings />
      ) : section === "notifications" ? (
        <NotificationSettings />
      ) : section === "preferences" ? (
        <PreferencesSettings />
      ) : (
        <LegacySettings section={section} />
      )}
    </SettingsFrame>
  );
}
