"use client";

import { useId, useRef, useState } from "react";
import { cx } from "@/components/ui/cx";
import { controlClass } from "@/components/ui/field";
import { fill } from "@/lib/copy";
import { recoverCopy } from "../copy/recover";
import { isRecoveryWord, phraseLength, recoveryWords, splitPhrase } from "../shared/phrase";

const copy = recoverCopy.phrase;

export function PhraseEntry({
  words,
  visible,
  onChange,
  onPasted,
}: {
  words: readonly string[];
  visible: boolean;
  onChange: (words: readonly string[]) => void;
  onPasted: (count: number) => void;
}) {
  const listId = useId();
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const [touched, setTouched] = useState<ReadonlySet<number>>(new Set());
  const focusBox = (index: number) => {
    boxes.current[Math.min(index, phraseLength - 1)]?.focus();
  };
  const setWord = (index: number, value: string) => {
    onChange(words.map((word, position) => (position === index ? value : word)));
  };
  return (
    <>
      {visible ? (
        <datalist id={listId}>
          {recoveryWords.map((word) => (
            <option key={word} value={word} />
          ))}
        </datalist>
      ) : null}
      <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {words.map((word, index) => {
          const unknown = touched.has(index) && word !== "" && !isRecoveryWord(word);
          const errorId = `${listId}-error-${String(index)}`;
          return (
            <li key={index} className="flex flex-col gap-1">
              <label className="relative block">
                <span className="text-faint pointer-events-none absolute inset-y-0 left-2.5 flex items-center font-mono text-sm tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="sr-only">{fill(copy.word, { n: String(index + 1) })}</span>
                <input
                  ref={(element) => {
                    boxes.current[index] = element;
                  }}
                  type={visible ? "text" : "password"}
                  value={word}
                  list={visible ? listId : undefined}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={unknown || undefined}
                  aria-describedby={unknown ? errorId : undefined}
                  className={cx(
                    controlClass,
                    "h-10 pr-2 pl-9 font-mono text-sm",
                    unknown && "decoration-pink-ink underline decoration-2 underline-offset-4",
                  )}
                  onChange={(event) => {
                    const value = event.target.value.toLowerCase();
                    if (/\s/.test(value)) {
                      setWord(index, value.trim());
                      focusBox(index + 1);
                      return;
                    }
                    setWord(index, value.replace(/[^a-z]/g, ""));
                  }}
                  onBlur={() => {
                    setTouched((current) => new Set(current).add(index));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      focusBox(index + 1);
                    }
                  }}
                  onPaste={(event) => {
                    const parts = splitPhrase(event.clipboardData.getData("text"));
                    if (parts.length < 2) return;
                    event.preventDefault();
                    onChange(
                      Array.from({ length: phraseLength }, (_, position) => parts[position] ?? ""),
                    );
                    setTouched(
                      new Set(parts.slice(0, phraseLength).map((_, position) => position)),
                    );
                    onPasted(parts.length);
                  }}
                />
              </label>
              {unknown ? (
                <span id={errorId} className="text-pink-ink text-sm">
                  {copy.notWord}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}
