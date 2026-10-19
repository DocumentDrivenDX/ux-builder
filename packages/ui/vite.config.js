import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/* npm run build: src/index.js -> dist/index.js, an ES module with React
   left to the app (a peer dependency), so the app's single copy is used.
   The CSS is not imported from JS: apps load @ux-builder/ui/ui.css themselves,
   after the theme CSS, and the build copies it to dist/ unchanged. Storybook
   uses this file for its plugins only. */

export default defineConfig({
  plugins: [react()],
  build: {
    // Three entries: the components, the icon library (one export per icon, so apps tree-shake it), and the patterns (ADR-020), so an app that uses none carries none.
    lib: { entry: { index: "src/index.js", icons: "src/icons/library.js", patterns: "src/patterns/index.js" }, formats: ["es"], fileName: (_, entry) => `${entry}.js` },
    // Code both entries use (the widgets the patterns compose, the theme context) is one shared chunk, so an app has one copy.
    rollupOptions: { external: ["react", "react-dom", "react/jsx-runtime"], output: { chunkFileNames: "shared-[hash].js" } },
    sourcemap: true,
  },
});
