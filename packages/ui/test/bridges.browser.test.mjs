/* Bridges in Chromium (US-045-AC2): a library styled by shadcn's
   variables (AI Elements, assistant-ui's components) follows the theme and appearance on <html> at run
   time, with no .dark class, outranks the library's own defaults whatever
   the load order, and a nested theme shows the nested theme.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const TOKENS = fileURLToPath(new URL("../../tokens/dist/", import.meta.url));
const resolved = (t, ap) => JSON.parse(readFileSync(join(TOKENS, `resolved/${t}.${ap}.json`), "utf8")).tokens;
const rgb = (hex) => { const n = hex.slice(1); return `rgb(${[0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)).join(", ")})`; };
const tmp = mkdtempSync(join(tmpdir(), "bridges-"));
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

// Stand-ins for the libraries' own defaults, loaded after the bridges: shadcn's globals.css and assistant-ui's default theme.
const LIBRARY_DEFAULTS = `:root { --background: #ffffff; --primary: #171717; }
.dark { --background: #0a0a0a; --primary: #fafafa; }`;
// What a component of each library does with the variables.
const COMPONENTS = `.shadcn-card { background: var(--background); color: var(--foreground); border-radius: var(--radius); font-family: var(--font-sans); }
.shadcn-button { background: var(--primary); color: var(--primary-foreground); }
.shadcn-muted { background: var(--muted); }`;

// @covers US-045-AC2
test("US-045-AC2: with data-theme and data-appearance on <html>, components follow run-time switching without .dark, outrank the library's defaults, and a nested theme shows its own", async () => {
  // The bridges load before the theme here, the harder order: the theme's appearance blocks set the 0.x alias --muted too.
  const sheets = ["bridges/shadcn/praxis-carbon.css", "bridges/shadcn/praxis-material.css", "themes.css"]
    .map((f) => `<link rel="stylesheet" href="${pathToFileURL(join(TOKENS, f))}">`).join("");
  const html = join(tmp, "page.html");
  writeFileSync(html, `<!doctype html><html data-theme="praxis-carbon" data-appearance="light"><head>${sheets}<style>${LIBRARY_DEFAULTS}${COMPONENTS}</style></head>
<body><div id="outer" class="shadcn-card"><button id="btn" class="shadcn-button">Send</button><div id="muted" class="shadcn-muted">Muted</div></div>
<section data-theme="praxis-material" data-appearance="dark"><div id="nested" class="shadcn-card">Nested</div></section></body></html>`);
  const page = await browser.newPage();
  await page.goto(pathToFileURL(html).href);
  const read = () => page.evaluate(() => Object.fromEntries(["outer", "btn", "muted", "nested"].map((id) => {
    const cs = getComputedStyle(document.getElementById(id));
    return [id, { bg: cs.backgroundColor, fg: cs.color, radius: cs.borderTopLeftRadius, font: cs.fontFamily }];
  })));

  const carbonLight = resolved("praxis-carbon", "light"), carbonDark = resolved("praxis-carbon", "dark"), materialDark = resolved("praxis-material", "dark");
  let r = await read();
  assert.equal(r.outer.bg, rgb(carbonLight["piq-color-ground"]), "the bridge outranks the library's :root default");
  assert.equal(r.outer.fg, rgb(carbonLight["piq-color-text"]));
  assert.equal(r.btn.bg, rgb(carbonLight["piq-color-structure"]));
  assert.equal(r.muted.bg, rgb(carbonLight["piq-color-surface-sunken"]), "shadcn's --muted, not the theme's 0.x alias --muted (muted text)");
  assert.equal(r.outer.radius, "0px", "Carbon's square corners");
  assert.match(r.outer.font, /IBM Plex Sans/);
  assert.equal(r.nested.bg, rgb(materialDark["piq-color-ground"]), "a nested theme shows the nested theme");

  // Run-time switch on <html>, with no .dark class anywhere.
  await page.evaluate(() => { document.documentElement.dataset.appearance = "dark"; });
  r = await read();
  assert.equal(await page.evaluate(() => document.querySelector(".dark")), null);
  assert.equal(r.outer.bg, rgb(carbonDark["piq-color-ground"]));
  assert.equal(r.btn.bg, rgb(carbonDark["piq-color-structure"]));
  assert.equal(r.nested.bg, rgb(materialDark["piq-color-ground"]), "the nested theme is unaffected");

  // A .dark class from the library's own toggle does not override the theme.
  await page.evaluate(() => { document.documentElement.dataset.appearance = "light"; document.documentElement.classList.add("dark"); });
  r = await read();
  assert.equal(r.outer.bg, rgb(carbonLight["piq-color-ground"]), "the theme's appearance wins over the library's .dark");

  // Theme switch, and the default appearance without data-appearance.
  await page.evaluate(() => { document.documentElement.classList.remove("dark"); document.documentElement.dataset.theme = "praxis-material"; delete document.documentElement.dataset.appearance; });
  r = await read();
  const mDefault = JSON.parse(readFileSync(join(TOKENS, "manifest.json"), "utf8")).themes.find((t) => t.name === "praxis-material").default;
  assert.equal(r.outer.bg, rgb(resolved("praxis-material", mDefault)["piq-color-ground"]));
  await page.close();
});
