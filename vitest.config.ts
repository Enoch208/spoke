import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "protocol",
          root: "packages/protocol",
          include: ["tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "api",
          root: "apps/api",
          include: ["tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: {
          alias: { "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)) },
        },
        test: {
          name: "web",
          root: "apps/web",
          include: ["tests/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
