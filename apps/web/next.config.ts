import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@spoke/protocol"],
  reactStrictMode: true,
};

export default config;
