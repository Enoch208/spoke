"use client";

import dynamic from "next/dynamic";

const IslandRoot = dynamic(() => import("./island-root").then((module) => module.IslandRoot), {
  ssr: false,
});

export function MarketingIsland() {
  return <IslandRoot />;
}
