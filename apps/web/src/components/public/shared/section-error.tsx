import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { common } from "@/lib/copy";

const sectionFailed = "Couldn’t load this section.";

export function SectionError({ retry }: { retry: () => void }) {
  return (
    <ErrorState
      variant="inline"
      title={sectionFailed}
      actions={
        <Button variant="ghost" size="sm" onClick={retry}>
          {common.tryAgain}
        </Button>
      }
    />
  );
}
