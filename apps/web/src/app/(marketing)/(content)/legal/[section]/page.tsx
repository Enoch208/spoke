import { InformationPage } from "@/components/platform/information-page";
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <InformationPage section={section} />;
}
