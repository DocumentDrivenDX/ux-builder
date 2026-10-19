/* Brand and design system fonts (ADR-017, CONTRACT-002, FEAT-001 THEME-03):
   every font declares its source, a bundled font carries a licence that
   allows shipping it, and a brand without fonts uses its design system's.

     npm test */

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { ComposeError, composePair, fontStack, load } from "../../packages/tokens/compose.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

// A copy of tokens/ and brand/ with one file edited; returns the loaded sources or the error.
function loadWith(file, edit) {
  const d = mkdtempSync(join(tmpdir(), "fonts-"));
  try {
    cpSync(join(ROOT, "tokens"), join(d, "tokens"), { recursive: true });
    cpSync(join(ROOT, "brand"), join(d, "brand"), { recursive: true });
    const p = join(d, "tokens", file);
    writeFileSync(p, JSON.stringify(edit(JSON.parse(readFileSync(p, "utf8")))));
    return load(join(d, "tokens"), join(d, "brand"));
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
}
const withBrandFont = (font) => loadWith("brands/praxis.brand.json", (b) => ({ ...b, fonts: { body: font } }));

describe("brand fonts", () => {
  // @covers US-001-AC5
  test("a bundled font licensed Proprietary fails the build", () => {
    assert.throws(() => withBrandFont({ family: "Acme Sans", fallback: ["sans-serif"], source: "bundled", license: "Proprietary" }),
      (e) => e instanceof ComposeError && /licence Proprietary.*OFL-1.1 or Apache-2.0/.test(e.message));
  });

  test("a bundled font with no licence fails the build", () => {
    assert.throws(() => withBrandFont({ family: "Acme Sans", fallback: ["sans-serif"], source: "bundled" }),
      (e) => e instanceof ComposeError && /licence none/.test(e.message));
  });

  test("a font with no source fails the build", () => {
    assert.throws(() => withBrandFont({ family: "Acme Sans", fallback: ["sans-serif"] }),
      (e) => e instanceof ComposeError && /declares no source/.test(e.message));
  });

  test("a client-hosted font with no url fails the build", () => {
    assert.throws(() => withBrandFont({ family: "Acme Sans", fallback: ["sans-serif"], source: "client-hosted" }),
      (e) => e instanceof ComposeError && /names no stylesheet url/.test(e.message));
  });

  test("a google font with a fallback passes and overrides the design system's", () => {
    const src = withBrandFont({ family: "Inter", fallback: ["system-ui", "sans-serif"], source: "google" });
    assert.equal(composePair(src, "praxis", "carbon", "dark").get("font.body").value, "Inter, system-ui, sans-serif");
    assert.match(composePair(src, "praxis", "carbon", "dark").get("font.mono").value, /^"IBM Plex Mono"/, "roles not overridden stay the design system's");
  });

  test("a bundled font licensed OFL-1.1 passes", () => {
    const src = withBrandFont({ family: "Inter", fallback: ["sans-serif"], source: "bundled", license: "OFL-1.1" });
    assert.ok(src.brands.get("praxis").fonts.body);
  });
});

describe("design system fonts", () => {
  test("a bundled design system font with a disallowed licence fails the build", () => {
    assert.throws(() => loadWith("design-systems/carbon.design-system.json", (ds) => {
      ds.fonts.body = { ...ds.fonts.body, source: "bundled", license: "Proprietary" };
      return ds;
    }), (e) => e instanceof ComposeError && /carbon\.design-system\.json: font body/.test(e.message));
  });
});

describe("a brand without fonts", () => {
  test("uses each shared design system's fonts", () => {
    const src = load(join(ROOT, "tokens"), join(ROOT, "brand"));
    assert.equal(src.brands.get("praxis").fonts, undefined);
    for (const [name, ds] of src.designSystems) {
      const m = composePair(src, "praxis", name, "dark");
      for (const r of ["display", "heading", "body", "mono"]) assert.equal(m.get(`font.${r}`).value, fontStack(ds.fonts[r]), `${name} ${r}`);
    }
  });
});

/* Fonts by declared source (ADR-017, FEAT-004 SDK-02, US-010-AC2 and AC3). */
describe("font CSS by source", async () => {
  const { themeFontCss } = await import("../../packages/tokens/fonts.mjs");
  const src = load(join(ROOT, "tokens"), join(ROOT, "brand"));

  // @covers US-010-AC2
  test("AC2: a design system's open-licensed faces are bundled, with font-display: swap and no third-party host", () => {
    for (const t of ["praxis-material", "praxis-carbon", "databricks", "synaptiq"]) {
      const { css, copies } = themeFontCss(src, src.themes.get(t));
      assert.match(css, /@font-face/, t);
      assert.doesNotMatch(css, /googleapis|gstatic|@import/, t);
      for (const face of css.match(/@font-face \{[\s\S]*?\}/g)) assert.match(face, /font-display: swap;/);
      assert.ok(copies.some((c) => c.file.endsWith(".LICENSE")), t);
    }
  });

  test("system faces load nothing", () => {
    for (const t of ["praxis", "plain", "praxis-fluentui"]) assert.doesNotMatch(themeFontCss(src, src.themes.get(t)).css, /@font-face|@import/, t);
  });

  test("only the declared weights are shipped", () => {
    const { css } = themeFontCss(src, src.themes.get("databricks"));
    const weights = (family) => [...new Set([...css.matchAll(new RegExp(`font-family: '${family}';[\\s\\S]*?font-weight: (\\d+)`, "g"))].map((m) => Number(m[1])))].sort();
    assert.deepEqual(weights("DM Sans"), [400, 500, 600]);
    assert.deepEqual(weights("DM Mono"), [400, 500]);
  });

  // @covers US-010-AC3
  test("AC3: a brand's google and client-hosted overrides load from where they say", () => {
    const s = loadWith("brands/praxis.brand.json", (b) => ({ ...b, fonts: {
      display: { family: "Playfair Display", fallback: ["Georgia", "serif"], source: "google", weights: [700] },
      body: { family: "Acme Sans", fallback: ["system-ui"], source: "client-hosted", url: "https://fonts.acme.example/acme-sans.css" },
    } }));
    const { css } = themeFontCss(s, s.themes.get("praxis"));
    assert.match(css, /@import url\("https:\/\/fonts\.googleapis\.com\/css2\?family=Playfair\+Display:wght@700&display=swap"\);/);
    assert.match(css, /@import url\("https:\/\/fonts\.acme\.example\/acme-sans\.css"\);/);
  });
});
