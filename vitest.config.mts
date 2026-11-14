import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pure helpers only: no DOM, no React rendering. `@` mirrors tsconfig's `@/*` → repo root.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["lib/**/__tests__/**/*.test.ts"],
  },
});
