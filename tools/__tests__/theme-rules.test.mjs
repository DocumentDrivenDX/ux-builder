/* The theme checks (tools/theme-rules.mjs) and their runner.

     npm test */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { CHECKS, checkAppearance, checkTheme, isRed } from "../theme-rules.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/* A theme that passes every check, in one appearance. */
const good = (over = {}) => ({
  "piq-color-ground": "#FFFFFF", "piq-color-surface": "#F0F0F0", "piq-color-border": "#B0B0B0",
  "piq-color-text-strong": "#000000", "piq-color-text": "#333333", "piq-color-text-muted": "#555555", "piq-color-text-subtle": "#6A6A6A",
  "piq-color-structure": "#1F2937", "piq-color-accent": "#1D4ED8",
  "piq-color-status-positive": "#126B2B", "piq-color-status-caution": "#7A5200", "piq-color-status-negative": "#B42318", "piq-color-status-info": "#1D4ED8",
  "piq-focus-ring": "2px solid #1D4ED8", "piq-focus-offset": "2px",
  "piq-font-size-small": "0.875rem", "piq-font-size-label": "0.75rem", "piq-badge-font-size": "0.75rem",
  "piq-font-weight-strong": "600", "piq-button-font-weight": "500",
  "piq-font-body": "Inter, sans-serif", "piq-font-heading": "Inter, sans-serif", "piq-font-display": "\"Tiempos\", serif",
  "piq-shadow-card": "0 1px 2px rgba(0, 0, 0, 0.06)", "piq-shadow-overlay": "0 4px 12px rgba(0, 0, 0, 0.1)",
  ...over,
});
const checks = (t) => checkAppearance(t).map((f) => f.check);

describe("the theme checks", () => {
  test("every check names a rule that names it back", () => {
    const rules = JSON.parse(readFileSync(join(ROOT, "guidelines/rules.json"), "utf8")).rules;
    for (const [check, id] of Object.entries(CHECKS)) {
      const r = rules.find((x) => x.id === id);
      assert.ok(r, `${check}: no rule ${id}`);
      assert.ok(r.checks.some((c) => c.kind === "theme" && c.id === check), `${id} does not name ${check}`);
    }
  });

  test("a theme that meets every rule has no findings", () => {
    assert.deepEqual(checkAppearance(good()), []);
  });

  // color.red-reserved
  test("red, coral and crimson read as red; blue, brown and peach do not", () => {
    for (const red of ["#D12800", "#FF6642", "#E1192B", "#C4463F"]) assert.ok(isRed(red), red);
    for (const not of ["#255FB1", "#945E3A", "#F7CFA5", "#6F00E0", "#29261F"]) assert.ok(!isRed(not), not);
    assert.deepEqual(checks(good({ "piq-color-accent": "#D12800", "piq-color-status-info": "#1D4ED8" })).filter((c) => c === "theme-red-reserved"), ["theme-red-reserved"]);
  });

  // theme.focus-ring
  test("a thin, offset-less, half-opacity or bottom-bar focus fails", () => {
    assert.ok(checks(good({ "piq-focus-ring": "1px solid #1D4ED8" })).includes("theme-focus-ring"));
    assert.ok(checks(good({ "piq-focus-offset": "0px" })).includes("theme-focus-ring"));
    assert.ok(checks(good({ "piq-focus-ring": "3px solid color-mix(in srgb, #1D4ED8 50%, transparent)" })).includes("theme-focus-ring"));
    const bar = checkAppearance(good({ "piq-field-focus-outline": "none", "piq-field-focus-shadow": "inset 0 -2px 0 #1D4ED8" }));
    assert.ok(bar.some((f) => f.key === "field focus" && /bottom bar alone/.test(f.message)));
    assert.deepEqual(checks(good({ "piq-field-focus-outline": "2px solid #1D4ED8" })), []);
    assert.deepEqual(checks(good({ "piq-field-focus-outline": "none", "piq-field-focus-shadow": "0 0 0 2px #1D4ED8" })), []);
  });

  // theme.small-text-floor
  test("small under 14 px, a field label under small, or anything under 12 px fails", () => {
    assert.ok(checks(good({ "piq-font-size-small": "0.75rem" })).includes("theme-small-text"));
    assert.ok(checks(good({ "piq-field-label-font-size": "0.75rem" })).includes("theme-small-text"));
    assert.ok(checks(good({ "piq-badge-font-size": "0.6875rem" })).includes("theme-small-text"));
  });

  // theme.contrast-margin
  test("a colour on the 4.5:1 line fails the 4.7:1 margin", () => {
    const f = checkAppearance(good({ "piq-color-text-subtle": "#767676" })); // 4.54:1 on white
    assert.ok(f.some((x) => x.check === "theme-contrast-margin" && x.key === "--piq-color-text-subtle on --piq-color-ground"));
  });

  // theme.text-tiers, theme.structure-accent-distinct
  test("tiers that look the same, or structure and accent that match, fail", () => {
    assert.ok(checks(good({ "piq-color-text-subtle": "#555555" })).includes("theme-text-tiers"));
    assert.ok(checks(good({ "piq-color-accent": "#1F2937" })).includes("theme-structure-accent"));
  });

  // theme.surface-separation
  test("a card with no tone, border or shadow apart from the ground fails", () => {
    assert.ok(checks(good({ "piq-color-surface": "#FFFFFF", "piq-color-border": "#FAFAFA", "piq-shadow-card": "none" })).includes("theme-surface-separation"));
    const dark = { "piq-color-ground": "#09090B", "piq-color-surface": "#101012", "piq-color-border": "#161618", "piq-shadow-card": "0 1px 3px rgba(0,0,0,0.1)" };
    assert.ok(checks(good(dark)).includes("theme-surface-separation"), "a faint shadow does not carry a dark card");
    assert.ok(!checks(good({ ...dark, "piq-shadow-card": "0 2px 8px rgba(0,0,0,0.45)" })).includes("theme-surface-separation"));
  });

  // theme.families-limited, theme.weights
  test("three families, light strong text or light button labels fail", () => {
    assert.ok(checks(good({ "piq-font-heading": "Georgia, serif" })).includes("theme-families"));
    assert.ok(checks(good({ "piq-font-weight-strong": "500" })).includes("theme-weights"));
    assert.ok(checks(good({ "piq-button-font-weight": "400" })).includes("theme-weights"));
  });

  // theme.dark-appearance, theme.weights across appearances
  test("dark that inherits light's values or weights fails; no dark at all fails", () => {
    assert.deepEqual(checkTheme({ light: good(), dark: undefined }).map((f) => f.key), ["missing"]);
    const dark = good({ "piq-color-ground": "#111111", "piq-color-surface": "#1C1C1C", "piq-color-text": "#EEEEEE", "piq-font-weight-strong": "500" });
    const f = checkTheme({ light: good(), dark });
    assert.ok(f.some((x) => x.check === "theme-dark-appearance" && x.key === "piq-color-accent"));
    assert.ok(f.some((x) => x.check === "theme-dark-appearance" && x.key === "piq-shadow-card"));
    assert.ok(f.some((x) => x.check === "theme-weights" && x.key.startsWith("piq-font-weight-strong")));
  });
});

describe("check-theme-rules", () => {
  const run = (dir, ...args) => spawnSync(process.execPath, [join(ROOT, "tools/check-theme-rules.mjs"), "--resolved", join(dir, "resolved"), "--themes", join(dir, "themes"), "--baseline", join(dir, "baseline.json"), ...args], { encoding: "utf8" });
  const setup = (light) => {
    const dir = mkdtempSync(join(tmpdir(), "theme-rules-"));
    mkdirSync(join(dir, "resolved")); mkdirSync(join(dir, "themes"));
    writeFileSync(join(dir, "themes/t.theme.json"), JSON.stringify({ name: "t" }));
    const dark = good({ "piq-color-ground": "#111111", "piq-color-surface": "#2A2A2A", "piq-color-border": "#555555", "piq-color-text-strong": "#FFFFFF", "piq-color-text": "#DDDDDD", "piq-color-text-muted": "#B5B5B5", "piq-color-text-subtle": "#9A9A9A", "piq-color-structure": "#E5E7EB", "piq-color-accent": "#7FA6FF", "piq-color-status-positive": "#5CC77A", "piq-color-status-caution": "#E0B04A", "piq-color-status-negative": "#FF8A80", "piq-color-status-info": "#7FA6FF", "piq-focus-ring": "2px solid #7FA6FF", "piq-shadow-card": "0 2px 8px rgba(0, 0, 0, 0.45)", "piq-shadow-overlay": "0 8px 24px rgba(0, 0, 0, 0.5)" });
    for (const [a, tokens] of [["light", light], ["dark", dark]]) writeFileSync(join(dir, `resolved/t.${a}.json`), JSON.stringify({ theme: "t", appearance: a, tokens }));
    return dir;
  };

  test("passes a theme with no findings, fails a new one, and fails a baseline entry that no longer happens", () => {
    const dir = setup(good());
    writeFileSync(join(dir, "baseline.json"), JSON.stringify({ known: [] }));
    let r = run(dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);

    const bad = setup(good({ "piq-color-accent": "#D12800" }));
    writeFileSync(join(bad, "baseline.json"), JSON.stringify({ known: [] }));
    r = run(bad);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /NEW +light +color\.red-reserved: the accent/);

    assert.equal(run(bad, "--update-baseline").status, 0);
    assert.equal(run(bad).status, 0, "a known finding passes");
    writeFileSync(join(bad, "resolved/t.light.json"), JSON.stringify({ theme: "t", appearance: "light", tokens: good() }));
    r = run(bad);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FIXED +t\.light: theme-red-reserved/);
  });
});
