/* How the builder's front end is compiled, shared by the local server
   (server.mjs) and the static build of the theme pages for GitHub Pages
   (tools/build-pages.mjs), so both show the same thing. */

import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { micrositeDataPlugin } from "./microsite-data.mjs";

export const APP = fileURLToPath(new URL(".", import.meta.url));
export const REPO = fileURLToPath(new URL("../..", import.meta.url));

export const viteOptions = () => ({
  // Tailwind compiles only the AI Components' CSS (packages/ui/ai/ai.css), which only the theme pages load.
  // The site's Reference and Proof data that only Node can read (microsite-data.mjs), as virtual:microsite-data.
  root: APP, configFile: false, plugins: [react(), tailwind(), micrositeDataPlugin()], logLevel: "warn",
  // The SDK's components from source, so the theme page's samples (the SDK's own Storybook stories, which import
  // from source) and the builder share one copy of each, and one ThemeProvider context. Its CSS stays the built files.
  resolve: { alias: [
    { find: /^@ux-builder\/ui$/, replacement: `${REPO}packages/ui/src/index.js` },
    { find: /^@ux-builder\/ui\/patterns$/, replacement: `${REPO}packages/ui/src/patterns/index.js` },
    { find: /^@ux-builder\/ui\/icons$/, replacement: `${REPO}packages/ui/src/icons/library.js` },
  ] },
});
