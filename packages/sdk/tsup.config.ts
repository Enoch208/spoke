import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "es2022",
  platform: "neutral",
  clean: true,
  splitting: false,
  treeshake: true,
  minify: true,
  noExternal: ["@spoke/protocol"],
  external: ["zod", "viem"],
  dts: {
    resolve: ["@spoke/protocol"],
    compilerOptions: {
      baseUrl: ".",
      paths: { "@spoke/protocol": ["../protocol/src/index.ts"] },
    },
  },
});
