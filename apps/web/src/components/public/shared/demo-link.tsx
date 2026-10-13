"use client";

import { Alert02Icon, TestTube01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useClientContext } from "@/lib/client/provider";
import { routes } from "@/lib/routes";
import { demoLinkCopy } from "../copy/demo-link";

export type IdentifierMatch = "pending" | "ok" | "demoInLive" | "liveInDemo";

export const isDemoIdentifier = (id: string) => id.startsWith("demo-");

export function useIdentifierMatch(id: string): IdentifierMatch {
  const { client, mode } = useClientContext();
  if (!client) return "pending";
  const demoId = isDemoIdentifier(id);
  if (mode === "live" && demoId) return "demoInLive";
  if (mode === "demo" && !demoId) return "liveInDemo";
  return "ok";
}

export function DemoLinkInLive() {
  const pathname = usePathname();
  return (
    <EmptyState
      variant="page"
      icon={TestTube01Icon}
      title={demoLinkCopy.title}
      body={demoLinkCopy.body}
      actions={
        <>
          <Button asChild>
            <Link href={`${routes.demo}?next=${encodeURIComponent(pathname)}`}>
              {demoLinkCopy.open}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={routes.explore}>{demoLinkCopy.explore}</Link>
          </Button>
        </>
      }
    />
  );
}

export function LiveLinkInDemo({ title, body }: { title: string; body: string }) {
  const pathname = usePathname();
  return (
    <EmptyState
      variant="page"
      icon={Alert02Icon}
      title={title}
      body={
        <>
          {body} {demoLinkCopy.liveInDemo}
        </>
      }
      actions={
        <Button asChild>
          <Link href={`${routes.demoExit}?next=${encodeURIComponent(pathname)}`}>
            {demoLinkCopy.exitDemo}
          </Link>
        </Button>
      }
    />
  );
}
