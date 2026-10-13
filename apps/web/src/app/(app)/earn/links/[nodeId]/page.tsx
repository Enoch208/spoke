import { LinkDetailPage } from "@/components/earn/link-detail/link-detail-page";

export default async function Page({ params }: { params: Promise<{ nodeId: string }> }) {
  const { nodeId } = await params;
  return <LinkDetailPage nodeId={decodeURIComponent(nodeId)} />;
}
