export const moveActive = (
  current: number,
  delta: 1 | -1,
  options: readonly { disabled?: boolean | undefined }[],
): number => {
  const count = options.length;
  if (count === 0) return -1;
  const start = current < 0 ? (delta === 1 ? -1 : count) : current;
  for (let step = 1; step <= count; step += 1) {
    const index = (((start + delta * step) % count) + count) % count;
    if (!options[index]?.disabled) return index;
  }
  return -1;
};
