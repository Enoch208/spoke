import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { recoveryCopy } from "../copy/recovery";
import { phraseLength } from "../shared/phrase";

const maskWidths = ["w-14", "w-10", "w-16", "w-12", "w-[60px]", "w-11"] as const;

export function PhraseGrid({ words, revealed }: { words: readonly string[]; revealed: boolean }) {
  const shown = revealed && words.length === phraseLength;
  return (
    <div className="relative">
      {shown ? null : <p className="sr-only">{recoveryCopy.write.hidden}</p>}
      <ol
        aria-hidden={shown ? undefined : true}
        className="bg-soft border-hairline grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl border p-4 sm:grid-cols-4"
      >
        {Array.from({ length: phraseLength }, (_, index) => {
          const word = shown ? words[index] : undefined;
          return (
            <li
              key={index}
              aria-label={
                word ? fill(recoveryCopy.write.word, { n: String(index + 1), word }) : undefined
              }
              className="bg-surface flex h-9 items-center gap-2 rounded-lg px-2.5"
            >
              <span className="text-faint w-5 shrink-0 font-mono text-sm tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              {word ? (
                <span className="text-ink truncate font-mono text-sm">{word}</span>
              ) : (
                <span
                  className={cx(
                    "bg-pill-edge h-3 rounded-full blur-[2px]",
                    maskWidths[index % maskWidths.length],
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
