import tsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsConfigPaths()],
  test: {
    environment: "node",
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.json",
    },
  },
});
