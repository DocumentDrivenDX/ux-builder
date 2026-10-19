/* Bundles a fixture app (test/fixtures/*.jsx) with React for a browser test,
   so a pattern's behaviour runs in Chromium as it would in an app. Returns
   the path of the bundled script. */

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const PKG = fileURLToPath(new URL("..", import.meta.url));

export async function bundleFixture(name, outDir) {
  const out = join(outDir, name);
  await build({
    configFile: false, root: PKG, logLevel: "error", plugins: [react()],
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: { outDir: out, emptyOutDir: true, minify: false, lib: { entry: join(PKG, "test/fixtures", `${name}.jsx`), formats: ["iife"], name: "Fixture", fileName: () => "app.js" } },
  });
  return join(out, "app.js");
}
