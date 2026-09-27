import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // `server-only` throws outside the React Server environment; tests run services directly.
      "server-only": path.resolve(__dirname, "tests/helpers/empty.ts"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["tests/helpers/global-setup.ts"],
    setupFiles: ["tests/helpers/setup.ts"],
    // All tests share one PostgreSQL test database.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    include: ["tests/**/*.test.ts"],
  },
});
