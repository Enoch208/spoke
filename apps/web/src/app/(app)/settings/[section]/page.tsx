import { SettingsPage } from "@/components/account/settings-page";
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <SettingsPage section={section} />;
}
