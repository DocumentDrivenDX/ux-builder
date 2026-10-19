/* The loading widgets in a real browser (US-021-AC6, AC7): the built theme
   CSS and ui.css in Chromium, with the widgets' own markup, so each design
   system's tokens decide the bar, the spinner and the skeleton.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProgressBar, Skeleton, Spinner } from "../dist/index.js";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const THEMES = join(PKG, "../tokens/dist/themes.css");
const UI = join(PKG, "dist/ui.css");
const tmp = mkdtempSync(join(tmpdir(), "loading-"));
let browser;

// Theme → what its design system sets (own anatomy: ui.css's fallbacks).
const EXPECT = {
  "praxis-material": { height: 4, radius: "2px", cap: "round", effect: "piq-pulse" },
  "praxis-carbon": { height: 8, radius: "0px", cap: "butt", effect: "piq-shimmer" },
  "praxis-fluentui": { height: 2, radius: "1px", cap: "round", effect: "piq-shimmer" },
  databricks: { height: 8, radius: "9999px", cap: "round", effect: "piq-pulse" },
  praxis: { height: 6, cap: "round", effect: "piq-pulse" },
};

const cell = (theme) => `<section data-theme="${theme}" data-appearance="light" id="${theme}" style="width:300px">${renderToStaticMarkup(h("div", null,
  h(ProgressBar, { label: "Uploading", value: 50 }),
  h(ProgressBar, { label: "Preparing", className: "indet" }),
  h(Spinner),
  h(Skeleton, { variant: "rect", height: 40 })))}</section>`;

async function open(reducedMotion) {
  const html = join(tmp, "page.html");
  writeFileSync(html, `<!doctype html><link rel="stylesheet" href="${pathToFileURL(THEMES)}"><link rel="stylesheet" href="${pathToFileURL(UI)}"><body>${Object.keys(EXPECT).map(cell).join("")}</body>`);
  const page = await browser.newPage({ reducedMotion });
  await page.goto(pathToFileURL(html).href);
  return page;
}

const measure = (page, theme) => page.locator(`#${theme}`).evaluate((root) => {
  const css = (sel) => getComputedStyle(root.querySelector(sel));
  const track = root.querySelector(".piq-progress__track");
  const fill = track.querySelector(".piq-progress__fill");
  const indet = css(".indet .piq-progress__fill");
  return {
    height: track.getBoundingClientRect().height,
    radius: css(".piq-progress__track").borderTopLeftRadius,
    share: fill.getBoundingClientRect().width / track.getBoundingClientRect().width,
    fill: css(".piq-progress__fill").backgroundColor,
    track: css(".piq-progress__track").backgroundColor,
    indet: { name: indet.animationName, opacity: indet.opacity, width: root.querySelector(".indet .piq-progress__fill").getBoundingClientRect().width / track.getBoundingClientRect().width },
    cap: css(".piq-spinner__arc").strokeLinecap,
    spin: { name: css(".piq-spinner__glyph").animationName, duration: css(".piq-spinner__glyph").animationDuration },
    skeleton: { name: css(".piq-skeleton").animationName, bg: css(".piq-skeleton").backgroundColor, height: root.querySelector(".piq-skeleton").getBoundingClientRect().height },
  };
});

before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

describe("US-021 in the browser", () => {
  // @covers US-021-AC6
  test("AC6: each design system sets the bar, spinner and skeleton; own anatomy gets working defaults", async () => {
    const page = await open("no-preference");
    for (const [theme, want] of Object.entries(EXPECT)) {
      const m = await measure(page, theme);
      assert.equal(m.height, want.height, `${theme}: bar height`);
      if (want.radius) assert.equal(m.radius, want.radius, `${theme}: bar radius`);
      assert.ok(Math.abs(m.share - 0.5) < 0.01, `${theme}: 50 fills half (${m.share})`);
      assert.notEqual(m.fill, m.track, `${theme}: the fill shows on the track`);
      assert.notEqual(m.fill, "rgba(0, 0, 0, 0)", `${theme}: a fill colour`);
      assert.equal(m.indet.name, "piq-progress-sweep", `${theme}: the unknown bar moves`);
      assert.equal(m.cap, want.cap, `${theme}: spinner ends`);
      assert.equal(m.spin.name, "piq-spin");
      assert.equal(m.skeleton.name, want.effect, `${theme}: skeleton motion`);
      assert.notEqual(m.skeleton.bg, "rgba(0, 0, 0, 0)", `${theme}: skeleton fill`);
      assert.equal(m.skeleton.height, 40);
    }
    await page.close();
  });

  // @covers US-021-AC7
  test("AC7: with reduced motion the bar and skeleton stand still and the spinner slows", async () => {
    const page = await open("reduce");
    for (const theme of Object.keys(EXPECT)) {
      const m = await measure(page, theme);
      assert.equal(m.indet.name, "none", `${theme}: the unknown bar stands still`);
      assert.equal(m.indet.width, 1, `${theme}: and fills the track faintly`);
      assert.ok(Number(m.indet.opacity) < 1);
      assert.equal(m.skeleton.name, "none", `${theme}: the skeleton stands still`);
      assert.equal(m.spin.name, "piq-spin", `${theme}: the spinner still turns`);
      assert.equal(m.spin.duration, "3s", `${theme}: slowly`);
    }
    await page.close();
  });
});
