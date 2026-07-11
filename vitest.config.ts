import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  test: {
    environment: "node",

    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],

    exclude: ["node_modules", ".next", "coverage"],

    coverage: {
      provider: "v8",

      reporter: ["text", "json", "html"],

      reportsDirectory: "coverage",

      include: ["src/lib/**/*.ts", "src/services/**/*.ts"],

      exclude: ["src/**/*.d.ts"],

      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      },
    },
  },
});
