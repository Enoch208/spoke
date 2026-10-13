import { notFound } from "next/navigation";
import { allNavItems } from "@/components/app/nav";
import { PreviewPage } from "@/components/platform/preview-page";

export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathname = `/${path.join("/")}`;
  if (!allNavItems.some((item) => item.href === pathname)) notFound();
  return <PreviewPage />;
}
