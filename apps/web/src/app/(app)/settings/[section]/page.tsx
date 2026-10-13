import { notFound } from "next/navigation";
import { isSettingsSection } from "@/components/account/settings/sections";
import { SettingsView } from "@/components/account/settings/settings-view";

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isSettingsSection(section)) notFound();
  return <SettingsView section={section} />;
}
