export const settingsCopy = {
  title: "Settings",
  sectionLabel: "Settings section",
  sections: {
    profile: "Profile",
    security: "Security",
    wallets: "Wallets",
    notifications: "Notifications",
    privacy: "Privacy",
    preferences: "Preferences",
  },
  descriptions: {
    profile: "How you appear on links you share and on your public profile.",
    security: "Your recovery phrase, passkeys, quick actions and signed-in devices.",
    wallets: "Addresses on your account and which one earns from new links.",
    notifications: "Which notifications you get inside Spoke.",
    privacy: "What Spoke shows publicly, and your data.",
    preferences: "How Spoke looks and where it opens.",
  },
  recoveryDot: "Recovery phrase not backed up",
  saveBar: {
    unsaved: "Unsaved changes",
    discard: "Discard",
    save: "Save",
    saving: "Saving…",
    failed: "Couldn't save. Your changes are still here.",
  },
  loadFailed: "We couldn't load your {thing}.",
} as const;
