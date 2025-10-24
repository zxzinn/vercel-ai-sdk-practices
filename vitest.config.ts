import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Allow running only integration tests via RUN_INTEGRATION=true
const includeIntegration = process.env.RUN_INTEGRATION === "true";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Test file patterns
    include: ["**/*.{test,spec}.ts?(x)"],
    // Exclude e2e and conditionally exclude/include integration tests
    exclude: includeIntegration
      ? ["**/node_modules/**", "**/e2e/**", "**/dist/**"]
      : [
          "**/node_modules/**",
          "**/e2e/**",
          "**/*.integration.test.ts",
          "**/dist/**",
        ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
