import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "vendor-react", test: /node_modules[\\/](?:react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: "vendor-interaction", test: /node_modules[\\/](?:motion|framer-motion|@dnd-kit)[\\/]/ },
            { name: "vendor-data", test: /node_modules[\\/](?:dexie|zod)[\\/]/ }
          ]
        }
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: ["e2e/**", "node_modules/**", "dist/**", ".worktrees/**"]
  }
});
