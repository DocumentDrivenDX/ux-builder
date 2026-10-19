import { defineConfig } from "@playwright/test";

/* The theme builder's UI suite (US-015 to US-019) and the test client that
   adopts the theme it saves.

     npm run e2e --workspace @ux-builder/theme-builder

   builder  one spec per step, plus the core flow, against the running
            builder (mock model, files-only review, a throwaway repository)
   client   after builder: builds @ux-builder/tokens from that repository and
            runs a separate React app that uses the saved theme */

export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:5190", viewport: { width: 1360, height: 900 } },
  webServer: { command: "node e2e/serve.mjs", url: "http://127.0.0.1:5190/api/context", reuseExistingServer: false, timeout: 60_000, cwd: new URL("..", import.meta.url).pathname },
  projects: [
    { name: "builder", testMatch: /e2e\/builder\/.*\.spec\.mjs$/ },
    { name: "client", testMatch: /e2e\/client\/.*\.spec\.mjs$/, dependencies: ["builder"] },
  ],
});
