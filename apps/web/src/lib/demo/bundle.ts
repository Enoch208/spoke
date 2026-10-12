import type { LoadedDemo } from "../client/demo/load";

let loaded: Promise<LoadedDemo> | null = null;

export const loadDemoBundle = () => {
  loaded ??= import("../client/demo/load").then(({ loadDemoClient }) => loadDemoClient());
  return loaded;
};
