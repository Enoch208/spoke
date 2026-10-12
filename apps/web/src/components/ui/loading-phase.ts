export const skeletonDelayMs = 150;
export const skeletonMinimumMs = 300;
export const slowNoticeMs = 10_000;

export type LoadingTiming = { startedAt: number; loadedAt: number | null };

export type LoadingPhase = "hidden" | "skeleton" | "slow" | "content";

const skeletonShownAt = ({ startedAt }: LoadingTiming) => startedAt + skeletonDelayMs;

export const loadingPhase = (timing: LoadingTiming, now: number): LoadingPhase => {
  const shownAt = skeletonShownAt(timing);
  if (timing.loadedAt === null) {
    const elapsed = now - timing.startedAt;
    if (elapsed < skeletonDelayMs) return "hidden";
    return elapsed >= slowNoticeMs ? "slow" : "skeleton";
  }
  if (timing.loadedAt < shownAt) return "content";
  return now < shownAt + skeletonMinimumMs ? "skeleton" : "content";
};

export const nextLoadingChange = (timing: LoadingTiming, now: number): number | null => {
  const shownAt = skeletonShownAt(timing);
  const candidates =
    timing.loadedAt === null
      ? [shownAt, timing.startedAt + slowNoticeMs]
      : timing.loadedAt < shownAt
        ? []
        : [shownAt + skeletonMinimumMs];
  return candidates.find((moment) => moment > now) ?? null;
};
