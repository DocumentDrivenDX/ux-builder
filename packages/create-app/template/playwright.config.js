import { defineConfig } from "@playwright/test";

// The starter's e2e tests run against the built app (npm run test:e2e).
export default defineConfig({
  testDir: "e2e",
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4174" },
  webServer: { command: "npm run build && npx vite preview --port 4174 --strictPort --host 127.0.0.1", url: "http://127.0.0.1:4174/", reuseExistingServer: false, timeout: 120_000 },
});
