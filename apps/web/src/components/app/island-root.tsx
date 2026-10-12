"use client";

import { GlobalLayer } from "./global-layer";
import { Providers } from "./providers";

export function IslandRoot() {
  return (
    <Providers>
      <GlobalLayer />
    </Providers>
  );
}
