import { required } from "@/lib/copy";

export function TestnetFootnote({ extra }: { extra?: string }) {
  return (
    <footer className="text-subtle border-hairline space-y-1 border-t pt-4 text-xs">
      <p>{required.demoToken}</p>
      {extra ? <p>{extra}</p> : null}
    </footer>
  );
}
