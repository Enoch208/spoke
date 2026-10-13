import type { Metadata } from "next";
import { clientMethodSchemas, envelope } from "@spoke/protocol";
import { ProfilePage } from "@/components/public/profile-page";
import { publicEnv } from "@/lib/public-env";

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ProfilePage handle={handle} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  if (handle.startsWith("demo-")) return { robots: { index: false, follow: false } };
  try {
    const response = await fetch(
      `${publicEnv.NEXT_PUBLIC_API_URL}/v1/distributors/${encodeURIComponent(handle)}/profile`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    const body: unknown = await response.json();
    const parsed = envelope(clientMethodSchemas["reputation.get"].output).safeParse(body);
    const profile = parsed.success && !("hidden" in parsed.data.data) ? parsed.data.data : null;
    const index = profile !== null && "indexing" in profile && profile.indexing === "index";
    return {
      title: profile?.displayName
        ? `${profile.displayName} (@${handle}) on Spoke`
        : `@${handle} on Spoke`,
      robots: { index, follow: index },
    };
  } catch {
    return { robots: { index: false, follow: false } };
  }
}
