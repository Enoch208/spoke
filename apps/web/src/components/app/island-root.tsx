"use client";

import { GlobalLayer } from "./global-layer";
import { Providers } from "./providers";
import { BannerStack } from "./banners";

export function IslandRoot() {
  return (
    <Providers>
      <BannerStack surface="marketing" />
      <GlobalLayer />
    </Providers>
  );
}
