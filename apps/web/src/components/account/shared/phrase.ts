import { entropyToMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export const phraseLength = 24;

const knownWords: ReadonlySet<string> = new Set(wordlist);

export const isRecoveryWord = (word: string) => knownWords.has(word);

export const recoveryWords: readonly string[] = wordlist;

const fixedEntropy = (seed: number) =>
  Uint8Array.from({ length: 32 }, (_, index) => (seed * 37 + index * 113 + 11) % 256);

export const samplePhrase: readonly string[] = entropyToMnemonic(fixedEntropy(7), wordlist).split(
  " ",
);

export const unknownSamplePhrase: readonly string[] = entropyToMnemonic(
  fixedEntropy(19),
  wordlist,
).split(" ");

export const sameWords = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((word, index) => word === b[index]);

export const splitPhrase = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);

export const phraseIsValid = (words: readonly string[]) =>
  validateMnemonic(words.join(" "), wordlist);

export const checkPositions = (random: () => number = Math.random): readonly number[] => {
  const picked = new Set<number>();
  while (picked.size < 3) picked.add(Math.floor(random() * phraseLength));
  return [...picked].sort((a, b) => a - b);
};

export const wordMatches = (typed: string, expected: string | undefined) =>
  expected !== undefined && typed.trim().toLowerCase() === expected;
