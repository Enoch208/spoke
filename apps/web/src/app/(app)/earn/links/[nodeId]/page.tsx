import { LinksPage } from "@/components/earn/links-page";
export default async function Page({ params }: { params: Promise<{ nodeId: string }> }) {
  const { nodeId } = await params;
  return <LinksPage nodeId={nodeId} />;
}
