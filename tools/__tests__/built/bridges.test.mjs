/* Bridges (US-045-AC1, AC3; ADR-023 rules 2 and 3): every theme mapped onto
   each generative UI library's variables, and the contrast gate over them.
   Reads packages/tokens/dist, so it runs after the build (npm run test:built); the failing case builds
   a copy of the sources with --root and --out. */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { SURFACES, bridgeFailures } from "../../../packages/tokens/bridges.mjs";
import { ratio } from "../../contrast.mjs";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const DIST = join(ROOT, "packages/tokens/dist");
const manifest = JSON.parse(readFileSync(join(DIST, "manifest.json"), "utf8"));
const resolved = (t, ap) => JSON.parse(readFileSync(join(DIST, `resolved/${t}.${ap}.json`), "utf8")).tokens;

/* A bridge stylesheet's blocks: selector list → { variable: value }. */
function blocks(css) {
  return [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, sel, body]) => ({
    selectors: sel.replace(/\/\*[\s\S]*?\*\//g, "").split(",").map((x) => x.trim()).filter(Boolean),
    vars: Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])),
  }));
}

// @covers US-045-AC1
test("US-045-AC1: every theme has a shadcn bridge, a block per appearance, setting every variable shadcn documents from the theme's tokens", () => {
  assert.deepEqual(Object.keys(SURFACES), ["shadcn"], "AI Elements and assistant-ui are both styled by shadcn's variables; CopilotKit is excluded (operator, 2026-10-19)");
  for (const t of manifest.themes) {
    for (const surface of Object.keys(SURFACES)) {
      const file = join(DIST, `bridges/${surface}/${t.name}.css`);
      assert.ok(existsSync(file), `${surface}/${t.name}.css`);
      const bs = blocks(readFileSync(file, "utf8"));
      assert.equal(bs.length, t.appearances.length, `${t.name}: a block per appearance`);
      for (const ap of t.appearances) {
        const b = bs.find((x) => x.selectors.includes(`[data-theme="${t.name}"][data-theme][data-appearance="${ap}"]`));
        assert.ok(b, `${t.name} ${ap} has its block`);
        if (ap === t.default) assert.ok(b.selectors.includes(`[data-theme="${t.name}"][data-theme]:not([data-appearance])`), "the default appearance applies without data-appearance");
        for (const v of SURFACES[surface].documented) assert.ok(b.vars[v], `${surface} ${t.name} ${ap} sets ${v}`);
        const tok = resolved(t.name, ap);
        const ground = tok["piq-color-ground"].toUpperCase();
        assert.equal(b.vars["--background"].toUpperCase(), ground, "values are the theme's own");
        const readable = (x) => ratio(x, tok["piq-color-ground"]) >= 4.5 && ratio(x, tok["piq-color-surface"]) >= 4.5;
        assert.equal(b.vars["--primary"].toUpperCase(), (readable(tok["piq-color-structure"]) ? tok["piq-color-structure"] : tok["piq-color-text-strong"]).toUpperCase(), "primary is the SDK's primary button colour, or its strong text where that is too faint to read as text");
        assert.equal(b.vars["--font-sans"], tok["piq-font-body"]);
      }
    }
  }
});

// @covers US-045-AC3
test("US-045-AC3: every bridge pairing passes 4.5:1 for text and 3:1 for the focus ring in every theme; a failing one fails the build, naming theme, appearance, surface and pair", () => {
  for (const t of manifest.themes) for (const ap of t.appearances) for (const s of Object.keys(SURFACES)) assert.deepEqual(bridgeFailures(resolved(t.name, ap), s), [], `${t.name} ${ap} ${s}`);
  // The muted text falls back to a stronger text role where the theme's is too faint on the muted panel (plain light).
  const plain = resolved("plain", "light");
  assert.ok(ratio(plain["piq-color-text-muted"], plain["piq-color-surface-sunken"]) < 4.5);
  const muted = blocks(readFileSync(join(DIST, "bridges/shadcn/plain.css"), "utf8"))[0].vars["--muted-foreground"];
  assert.ok(ratio(muted, plain["piq-color-surface-sunken"]) >= 4.5);

  const d = mkdtempSync(join(tmpdir(), "bridge-bad-"));
  try {
    cpSync(join(ROOT, "tokens"), join(d, "tokens"), { recursive: true });
    cpSync(join(ROOT, "brand"), join(d, "brand"), { recursive: true });
    const p = join(d, "tokens/brands/plain.brand.json");
    const brand = JSON.parse(readFileSync(p, "utf8"));
    brand.appearances.light.state.closed.$value = "#C8C8C8";     // a destructive colour too faint to read on the page
    writeFileSync(p, JSON.stringify(brand, null, 2));
    const r = spawnSync("node", [join(ROOT, "packages/tokens/build.mjs"), "--root", d, "--out", join(d, "dist")], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /build failed: \d+ bridge pairings? fail contrast/);
    assert.match(r.stderr, /plain light, shadcn bridge: destructive on background is [\d.]+:1, below 4\.5:1/);
  } finally { rmSync(d, { recursive: true, force: true }); }
});
