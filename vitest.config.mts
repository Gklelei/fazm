import { defineConfig } from "vitest/config";
import path from "path";

const rootDir = path.dirname(new URL(import.meta.url).pathname);
const resolve = { alias: { "@": path.resolve(rootDir, "./src") } };

export default defineConfig({
  resolve,
  test: {
    projects: [
      {
        resolve,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts"],
        },
      },
      {
        // Server actions against a real, throwaway Postgres database
        // (TEST_DATABASE_URL, must end in _test). One file at a time: they share it.
        resolve,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          setupFiles: ["src/test/setup-int.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
