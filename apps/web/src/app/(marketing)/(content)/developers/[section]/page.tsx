import { DevelopersPage } from "@/components/platform/developers-page";
import { Providers } from "@/components/app/providers";
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return (
    <Providers>
      <DevelopersPage section={section} />
    </Providers>
  );
}
