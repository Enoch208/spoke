import {
  LockIcon,
  Notification01Icon,
  Shield01Icon,
  SlidersHorizontalIcon,
  UserIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export const settingsSections = [
  "profile",
  "security",
  "wallets",
  "notifications",
  "privacy",
  "preferences",
] as const;

export type SettingsSection = (typeof settingsSections)[number];

export const isSettingsSection = (value: string): value is SettingsSection =>
  settingsSections.some((section) => section === value);

export const sectionIcons: Record<SettingsSection, IconSvgElement> = {
  profile: UserIcon,
  security: Shield01Icon,
  wallets: Wallet01Icon,
  notifications: Notification01Icon,
  privacy: LockIcon,
  preferences: SlidersHorizontalIcon,
};
