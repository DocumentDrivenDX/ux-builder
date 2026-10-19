/* A client app adopts the theme the builder just saved (acme-legal-carbon,
   from builder/core-flow.spec.mjs): @ux-builder/tokens is built from the
   builder's repository, exactly as a release would build it, and the client
   imports the theme, its fonts and the widgets as "Use in your app" says.
   Everything checked here is what the app renders. */

import react from "@vitejs/plugin-react";
import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { REPO } from "../helpers.mjs";

const CLIENT = fileURLToPath(new URL(".", import.meta.url));
const PORT = 5191;
let saved, dist, server, resolved;

test.beforeAll(async () => {
  saved = JSON.parse(readFileSync(new URL("../.saved.json", import.meta.url), "utf8"));
  dist = join(saved.root, "dist-client");
  const build = spawnSync(process.execPath, [join(REPO, "packages/tokens/build.mjs"), "--root", saved.root, "--out", dist], { encoding: "utf8" });
  if (build.status !== 0) throw new Error(`token build failed:\n${build.stderr}`);
  resolved = Object.fromEntries(["light", "dark"].map((ap) => [ap, JSON.parse(readFileSync(join(dist, "resolved", `${saved.theme}.${ap}.json`), "utf8")).tokens]));
  server = await createServer({
    root: CLIENT, configFile: false, logLevel: "warn",
    plugins: [react(), { name: "theme-under-test", transform: (code, id) => (id.endsWith("main.jsx") ? code.replaceAll("__THEME__.css", `${saved.theme}.css`).replace("const THEME = __THEME__;", `const THEME = ${JSON.stringify(saved.theme)};`) : null) }],
    resolve: { alias: [{ find: /^@ux-builder\/tokens\/(.*)$/, replacement: `${dist}/$1` }] },
    server: { host: "127.0.0.1", port: PORT, strictPort: true, hmr: false, fs: { allow: [REPO, saved.root, realpathSync(saved.root)] } },   // macOS: /var is /private/var
  });
  await server.listen();
});
test.afterAll(async () => { await server?.close(); });

const rgb = (hex) => { const h = hex.replace("#", ""); return `rgb(${[0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ")})`; };
const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const style = (page, sel, prop) => page.locator(sel).first().evaluate((el, p) => getComputedStyle(el)[p], prop);

async function open(page) {
  const problems = [], external = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push(m.text()); });
  page.on("request", (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url()); });
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await expect(page.getByTestId("provider")).toHaveAttribute("data-theme", saved.theme);
  return { problems, external };
}

async function colourTokens(page, appearance) {
  const expected = Object.entries(resolved[appearance]).filter(([k, v]) => k.startsWith("piq-") && /^#[0-9a-f]{6}$/i.test(v));
  const actual = await page.getByTestId("provider").evaluate((el, keys) => Object.fromEntries(keys.map((k) => [k, getComputedStyle(el).getPropertyValue(`--${k}`).trim()])), expected.map(([k]) => k));
  return { expected, actual };
}

test.describe(`a client app on the generated theme`, () => {
  test("renders with the theme on, and no errors", async ({ page }) => {
    const { problems } = await open(page);
    await expect(page.getByTestId("state")).toHaveText(`${saved.theme} · light`);
    await expect(page.getByTestId("provider")).toHaveAttribute("data-appearance", "light");
    await expect(page.getByRole("heading", { name: "Matters" })).toBeVisible();
    expect(problems).toEqual([]);
  });

  // @covers US-010-AC1
  test("every colour token on the page is the generated brand's, light", async ({ page }) => {
    await open(page);
    const { expected, actual } = await colourTokens(page, "light");
    expect(expected.length).toBeGreaterThan(20);
    for (const [k, v] of expected) expect(actual[k].toUpperCase(), k).toBe(v.toUpperCase());
    const brand = JSON.parse(readFileSync(join(saved.root, `tokens/brands/${saved.brand}.brand.json`), "utf8"));
    expect(actual["piq-color-accent"].toUpperCase()).toBe(brand.appearances.light.color.accent.$value.toUpperCase());
  });

  test("the widgets wear the brand's colours, readably", async ({ page }) => {
    await open(page);
    const t = resolved.light;
    expect(await style(page, '[data-testid="primary"]', "backgroundColor")).toBe(rgb(t["piq-color-structure"]));
    const pairs = [
      ['[data-testid="primary"]', "color", '[data-testid="primary"]', "backgroundColor"],
      ['[data-testid="body-text"]', "color", '[data-testid="page"]', "backgroundColor"],
      ['[data-testid="muted-text"]', "color", '[data-testid="page"]', "backgroundColor"],
      ['[data-testid="heading"]', "color", '[data-testid="page"]', "backgroundColor"],
      [".piq-card__title", "color", ".piq-card", "backgroundColor"],
    ];
    for (const [fg, fp, bg, bp] of pairs) expect(ratio(await style(page, fg, fp), await style(page, bg, bp)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  test(`the widgets take the ${"design system"}'s shapes`, async ({ page }) => {
    await open(page);
    const t = resolved.light;
    const px = (v) => (v === "0" ? "0px" : v);
    expect(await style(page, '[data-testid="primary"]', "borderTopLeftRadius")).toBe(px(t["piq-button-radius"]));
    expect(await style(page, '[data-testid="primary"]', "minHeight")).toBe(t["piq-button-height"]);
    expect(await style(page, "input.piq-field__input", "borderTopLeftRadius")).toBe(px(t["piq-field-radius"]));
  });

  test("the design system's fonts load from the SDK, not Google", async ({ page }) => {
    const { external } = await open(page);
    const family = resolved.light["piq-font-body"].split(",")[0].replace(/"/g, "").trim();
    expect(await style(page, '[data-testid="body-text"]', "fontFamily")).toContain(family);
    const loaded = await page.evaluate(async (f) => { await document.fonts.ready; return [...document.fonts].filter((x) => x.family.replace(/"/g, "") === f && x.status === "loaded").length; }, family);
    expect(loaded, `${family} faces loaded`).toBeGreaterThan(0);
    expect(external).toEqual([]);
  });

  test("the icons are the design system's set", async ({ page }) => {
    await open(page);
    const sets = await page.locator("svg.piq-icon").evaluateAll((els) => [...new Set(els.map((e) => e.dataset.iconSet))]);
    expect(sets).toEqual([saved.designSystem === "databricks" ? "lucide" : saved.designSystem]);
  });

  test("the logo the builder saved is drawn", async ({ page }) => {
    await open(page);
    // A bundler may inline a small logo as a data: URI, so check what is drawn, not a request.
    const bg = await style(page, '[data-testid="logo"]', "backgroundImage");
    const drawn = /brand\/[^/]+\/logo(-framed)?\.svg/.test(bg) || decodeURIComponent(bg).includes("Acme Legal logo") || Buffer.from(bg.match(/base64,([^")]+)/)?.[1] ?? "", "base64").toString().includes("Acme Legal logo");
    expect(drawn, bg.slice(0, 120)).toBe(true);
    expect(await page.getByTestId("logo").evaluate((el) => el.getBoundingClientRect().width)).toBe(48);
  });

  test("switching to dark restyles everything with the brand's dark palette", async ({ page }) => {
    const { problems } = await open(page);
    await page.getByRole("button", { name: "Switch to dark" }).click();
    await expect(page.getByTestId("provider")).toHaveAttribute("data-appearance", "dark");
    await expect(page.getByTestId("state")).toHaveText(`${saved.theme} · dark`);
    const { expected, actual } = await colourTokens(page, "dark");
    for (const [k, v] of expected) expect(actual[k].toUpperCase(), k).toBe(v.toUpperCase());
    await expect.poll(() => style(page, '[data-testid="primary"]', "backgroundColor")).toBe(rgb(resolved.dark["piq-color-structure"]));
    expect(ratio(await style(page, '[data-testid="body-text"]', "color"), await style(page, '[data-testid="page"]', "backgroundColor"))).toBeGreaterThanOrEqual(4.5);
    expect(problems).toEqual([]);
  });

  test("the client passes the SDK's lint rule for its theme", async () => {
    const { ESLint } = await import("eslint");
    const uxBuilder = (await import("@ux-builder/ui/eslint")).default;
    const eslint = new ESLint({ cwd: CLIENT, overrideConfigFile: true, overrideConfig: [{
      files: ["**/*.jsx"], plugins: { "ux-builder": uxBuilder },
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      rules: { "ux-builder/no-hard-coded-values": ["error", { theme: "praxis" }] },
    }] });
    const [result] = await eslint.lintFiles([join(CLIENT, "main.jsx")]);
    expect(result.messages.map((m) => `${m.line} ${m.message}`)).toEqual([]);
  });

  test("the widgets work: toast, segments, sorting", async ({ page }) => {
    await open(page);
    await page.getByTestId("primary").click();
    await expect(page.locator(".piq-toast")).toContainText("Entry moved to review.");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.locator(".piq-toast")).toHaveCount(0);
    await page.getByRole("radio", { name: "Time" }).click();
    await expect(page.getByRole("radio", { name: "Time" })).toHaveAttribute("aria-checked", "true");
    const first = () => page.locator("tbody tr").first().locator("td").first().innerText();
    await page.getByRole("button", { name: /Hours/ }).click();
    const a = await first();
    await page.getByRole("button", { name: /Hours/ }).click();
    expect(await first()).not.toBe(a);
  });
});
