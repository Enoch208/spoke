import { Search01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/lib/routes";
import { campaignCopy } from "../copy/campaign";

export function CampaignNotFound() {
  return (
    <EmptyState
      variant="page"
      icon={Search01Icon}
      title={campaignCopy.notFound.title}
      body={campaignCopy.notFound.body}
      actions={
        <>
          <Button asChild>
            <Link href={routes.explore}>{campaignCopy.notFound.explore}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={routes.home}>{campaignCopy.notFound.home}</Link>
          </Button>
        </>
      }
    />
  );
}
