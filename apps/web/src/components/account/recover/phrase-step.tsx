"use client";

import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { Callout } from "@/components/public/shared/callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { useUiStore } from "@/lib/stores/ui";
import { recoverCopy } from "../copy/recover";
import {
  isRecoveryWord,
  phraseIsValid,
  phraseLength,
  samplePhrase,
  sameWords,
  unknownSamplePhrase,
} from "../shared/phrase";
import { PhraseEntry } from "./phrase-entry";

const copy = recoverCopy.phrase;

export const emptyPhrase = (): readonly string[] => Array.from({ length: phraseLength }, () => "");

export const phraseReady = (words: readonly string[]) =>
  words.length === phraseLength && words.every((word) => word !== "" && isRecoveryWord(word));

export function phraseProblem(words: readonly string[], pasted: number | null) {
  if (pasted !== null && pasted !== phraseLength) return pasted === 12 ? "twelve" : "count";
  if (phraseReady(words) && !phraseIsValid(words)) return "checksum";
  return null;
}

export function PhraseStep({
  words,
  onWords,
  pasted,
  onPasted,
  demo,
  checked,
}: {
  words: readonly string[];
  onWords: (words: readonly string[]) => void;
  pasted: number | null;
  onPasted: (count: number | null) => void;
  demo: boolean;
  checked: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const problem = phraseProblem(words, pasted);
  const sample = sameWords(words, samplePhrase) || sameWords(words, unknownSamplePhrase);
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="w-fit"
        icon={visible ? ViewOffIcon : ViewIcon}
        onClick={() => {
          setVisible((current) => !current);
        }}
      >
        {visible ? copy.hide : copy.show}
      </Button>
      {demo ? (
        <div className="bg-lilac-soft flex flex-wrap items-center gap-x-1 gap-y-1 rounded-2xl px-2 py-1.5">
          <Badge tone="lilac" className="bg-surface/70">
            {copy.demoTag}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onWords(samplePhrase);
              onPasted(null);
            }}
          >
            {copy.useSample}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onWords(unknownSamplePhrase);
              onPasted(null);
            }}
          >
            {copy.useUnknown}
          </Button>
        </div>
      ) : null}
      {sample ? (
        <Badge tone="lilac" className="w-fit">
          {copy.sampleBadge}
        </Badge>
      ) : null}
      <PhraseEntry
        words={words}
        visible={visible}
        onChange={(next) => {
          onWords(next);
          onPasted(null);
        }}
        onPasted={onPasted}
      />
      <p className="text-subtle text-sm">{copy.note}</p>
      {problem === "count" && pasted !== null ? (
        <Callout tone="caution">{fill(copy.wrongCount, { n: String(pasted) })}</Callout>
      ) : null}
      {problem === "twelve" ? (
        <Callout
          tone="caution"
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                useUiStore.getState().open("M-03", { reason: "open" });
              }}
            >
              {copy.connectWallet}
            </Button>
          }
        >
          {copy.twelve}
        </Callout>
      ) : null}
      {problem === "checksum" && checked ? <Callout tone="danger">{copy.checksum}</Callout> : null}
    </>
  );
}
