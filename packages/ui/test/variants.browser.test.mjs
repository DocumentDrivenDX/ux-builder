/* Design-system variants on the same screens (US-030-AC1, AC4, AC5, AC6;
   ADR-022), in Chromium. Carbon is compared with a test design system,
   composed by the real token build, that names the other variant at every
   point (rail, enclosed tabs, compact page header, banded rows), so each
   point is seen to change while the markup does not.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load, themeCss } from "../../tokens/compose.mjs";
import { Tabs } from "../dist/index.js";
import { AppShell, CollectionList } from "../dist/patterns.js";
import { bundleFixture } from "./bundle.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const ROOT = join(PKG, "../..");
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const tmp = mkdtempSync(join(tmpdir(), "variants-"));
let browser, testThemeCss, formJs;

// The test design system: Carbon's anatomy with the other variant at every point.
function composeTestTheme() {
  const d = join(tmp, "src");
  cpSync(join(ROOT, "tokens"), join(d, "tokens"), { recursive: true });
  cpSync(join(ROOT, "brand"), join(d, "brand"), { recursive: true });
  const carbon = JSON.parse(readFileSync(join(d, "tokens/design-systems/carbon.design-system.json"), "utf8"));
  writeFileSync(join(d, "tokens/design-systems/varied.design-system.json"), JSON.stringify({ ...carbon, name: "varied", title: "Varied", variants: { navigation: "rail", tabs: "enclosed", "page-header": "compact", table: "banded" } }));
  writeFileSync(join(d, "tokens/themes/praxis-varied.theme.json"), JSON.stringify({ name: "praxis-varied", title: "Praxis Varied", brand: "praxis", designSystem: "varied" }));
  return themeCss(load(join(d, "tokens"), join(d, "brand")), "praxis-varied");
}

const NAV = ["Home", "Matters", "Clients"].map((label, i) => ({ id: label.toLowerCase(), label, href: `#${label.toLowerCase()}`, icon: ["home", "view", "user"][i] }));
const ROWS = Array.from({ length: 4 }, (_, i) => ({ id: `m${i}`, name: `Matter ${i + 1}`, client: "Acme" }));
const screen = () => renderToStaticMarkup(h(AppShell, { nav: NAV, current: "matters", brand: h("strong", null, "Acme") },
  h(CollectionList, { title: "Matters", columns: [{ key: "name", label: "Matter", priority: true }, { key: "client", label: "Client", priority: true }], rows: ROWS }),
  h(Tabs, { label: "Matter", tabs: [{ id: "a", label: "Overview", panel: "A" }, { id: "b", label: "Documents", panel: "B" }] })));

async function open(body, { theme = "praxis-carbon", width = 1366 } = {}) {
  const html = join(tmp, `p-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(html, `<!doctype html><html data-theme="${theme}" data-appearance="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1">${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}<style>${testThemeCss}</style><style>body{margin:0}</style></head><body>${body}</body></html>`);
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(pathToFileURL(html).href);
  return page;
}
// What each variant point looks like, read from computed styles.
const look = (page, scope = "") => page.evaluate((s) => {
  const q = (sel) => document.querySelector(`${s} ${sel}`.trim());
  const css = (sel) => getComputedStyle(q(sel));
  return {
    navigation: css(".piq-shell__side .piq-primary-nav__link").flexDirection,
    tabs: css('.piq-tabs__tab[aria-selected="true"]').backgroundColor !== "rgba(0, 0, 0, 0)" ? "enclosed" : "underlined",
    pageHeader: css(".piq-page-header__title").fontSize,
    table: css(".piq-collection__table tbody tr:nth-child(2)").backgroundColor !== "rgba(0, 0, 0, 0)" ? "banded" : "ruled",
  };
}, scope);

before(async () => { browser = await chromium.launch(); testThemeCss = composeTestTheme(); formJs = await bundleFixture("form-app", tmp); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

describe("US-030 in Chromium", () => {
  // @covers US-030-AC1
  test("AC1: two design systems naming different variants show each point's variant, with identical markup", async () => {
    const carbon = await open(screen(), { theme: "praxis-carbon" });
    const varied = await open(screen(), { theme: "praxis-varied" });
    const a = await look(carbon), b = await look(varied);
    assert.deepEqual([a.navigation, a.tabs, a.table], ["row", "underlined", "ruled"], "Carbon's choices");
    assert.deepEqual([b.navigation, b.tabs, b.table], ["column", "enclosed", "banded"], "the other variant at each point");
    assert.notEqual(a.pageHeader, b.pageHeader, "large versus compact page header");
    const dom = (p) => p.evaluate(() => document.body.innerHTML);
    assert.equal(await dom(carbon), await dom(varied), "the same elements, order, text and actions");
    await carbon.close(); await varied.close();
  });

  // @covers US-030-AC5
  test("AC5: a pattern in a nested theme shows the inner variants, the outer pattern the outer ones, with attributes only", async () => {
    const page = await open(`<div id="outer">${screen()}</div><div id="inner" data-theme="praxis-varied" data-appearance="dark">${screen()}</div>`, { theme: "praxis-carbon" });
    const outer = await look(page, "#outer"), inner = await look(page, "#inner");
    assert.deepEqual([outer.navigation, outer.tabs, outer.table], ["row", "underlined", "ruled"]);
    assert.deepEqual([inner.navigation, inner.tabs, inner.table], ["column", "enclosed", "banded"]);
    await page.close();
  });

  // @covers US-030-AC4
  test("AC4: switching theme with a dialog open keeps it open, keeps focus and input, and changes no content", async () => {
    const page = await open(`<div id="root"></div><script src="${pathToFileURL(formJs)}"></script>`, { theme: "praxis-carbon", width: 1024 });
    await page.locator("#quick").click();
    const field = page.locator("dialog[open] input").first();
    await field.fill("Acme v. Beta");
    // The sticky clearance is measured from the bar, whose height the theme may change: layout, not content.
    const markup = () => page.evaluate(() => document.getElementById("root").innerHTML.replace(/ style="scroll-padding-block-end: [\d.]+px;"/g, ""));
    const before = { html: await markup(), id: await page.evaluate(() => document.activeElement.id) };
    for (const [theme, appearance] of [["praxis-material", "light"], ["praxis-varied", "dark"]]) {
      await page.evaluate(([t, a]) => { document.documentElement.dataset.theme = t; document.documentElement.dataset.appearance = a; }, [theme, appearance]);
      await page.waitForTimeout(300);
      const now = await page.evaluate(() => ({ id: document.activeElement.id, open: !!document.querySelector("dialog[open]"), value: document.querySelector("dialog[open] input").value }));
      assert.deepEqual({ ...now, html: (await markup()) === before.html }, { html: true, id: before.id, open: true, value: "Acme v. Beta" }, `${theme} ${appearance}`);
    }
    await page.close();
  });

  // @covers US-030-AC6
  test("AC6: in the rail every destination keeps its label as its accessible name, as in the side menu", async () => {
    const names = async (theme) => {
      const page = await open(screen(), { theme });
      const r = await page.locator(".piq-shell__side .piq-primary-nav__link").evaluateAll((links) => links.map((a) => ({ name: (a.getAttribute("aria-label") ?? a.textContent).trim(), labelShown: a.querySelector(".piq-primary-nav__label").checkVisibility() })));
      const tree = await page.locator(".piq-shell__side nav").ariaSnapshot();
      await page.close();
      return { r, tree };
    };
    const side = await names("praxis-carbon"), rail = await names("praxis-varied");
    assert.deepEqual(rail.r, side.r);
    assert.deepEqual(rail.r.map((x) => x.name), NAV.map((n) => n.label));
    assert.ok(rail.r.every((x) => x.labelShown), "labels stay visible in the rail");
    assert.equal(rail.tree, side.tree, "the same accessibility tree");
  });
});
