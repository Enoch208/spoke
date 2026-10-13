const browsers: readonly [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const systems: readonly [RegExp, string][] = [
  [/iPhone|iPad/, "iPhone"],
  [/Android/, "Android"],
  [/Mac OS X/, "macOS"],
  [/Windows/, "Windows"],
  [/Linux/, "Linux"],
];

const firstMatch = (agent: string, table: readonly [RegExp, string][], fallback: string) =>
  table.find(([pattern]) => pattern.test(agent))?.[1] ?? fallback;

export const deviceLabel = (agent: string) =>
  `${firstMatch(agent, browsers, "Browser")} on ${firstMatch(agent, systems, "this device")}`;
