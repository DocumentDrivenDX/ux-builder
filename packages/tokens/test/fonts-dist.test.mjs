/* The built fonts (US-010-AC2, AC4; FEAT-004 SDK-02), against dist/.

     npm run build && npm test --workspace @ux-builder/tokens */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const ROOT = join(PKG, "../..");
const FONTS = join(PKG, "dist/fonts");

// @covers US-010-AC4
test("AC4: every bundled font file has an OFL-1.1 or Apache-2.0 licence beside it", () => {
  const files = readdirSync(FONTS).filter((f) => f.endsWith(".woff2"));
  assert.ok(files.length >= 20, `${files.length} files`);
  for (const f of files) {
    const family = f.replace(/-latin(-ext)?-\d+-normal\.woff2$/, "");
    const lic = join(FONTS, `${family}.LICENSE`);
    assert.ok(existsSync(lic), `${f}: no ${family}.LICENSE`);
    assert.match(readFileSync(lic, "utf8"), /SIL OPEN FONT LICENSE|Apache License/i, `${family}.LICENSE`);
  }
});

test("every url() in the font CSS points at a shipped file", () => {
  for (const css of ["fonts.css", ...readdirSync(FONTS).filter((f) => f.endsWith(".css")).map((f) => `fonts/${f}`)]) {
    const text = readFileSync(join(PKG, "dist", css), "utf8");
    for (const [, u] of text.matchAll(/url\("\.\/([^"]+)"\)/g)) assert.ok(existsSync(join(PKG, "dist", css.includes("/") ? "fonts" : "", u)), `${css}: ${u}`);
  }
});

// @covers US-010-AC2
test("AC2: the gallery and Storybook load the SDK's fonts, not Google's", () => {
  const offenders = [];
  const scan = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (!["node_modules", "fixtures", "__tests__"].includes(e.name)) scan(p); continue; }
      if (/\.(m?js|jsx|html|css)$/.test(e.name) && /fonts\.googleapis\.com/.test(readFileSync(p, "utf8"))) offenders.push(p);
    }
  };
  scan(join(ROOT, "tools"));
  scan(join(ROOT, "packages/ui/.storybook"));
  assert.deepEqual(offenders, []);
});
