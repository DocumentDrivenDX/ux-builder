/* Adaptive Cards in Chromium (US-083, US-085; ADR-029, CONTRACT-004
   Adaptive Cards): the built @ux-builder/ui/adaptive-cards in a fixture app
   (test/fixtures/adaptive-cards-app.jsx), with the official 1.6 sample
   cards (test/fixtures/adaptive-cards/samples, MIT, read as data), the
   theme switch, the compact collapse, the actions and their approvals, and
   the audit on the rendered cards. Images in the samples are swapped for an
   inline one, so nothing is fetched.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { copyFileSync, createReadStream, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { basename, extname, join, normalize } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { audit } from "../../audit/audit.mjs";
import { bundleFixture } from "./bundle.mjs";
import { CLEAN, COLUMNS, DESTRUCTIVE, EVERY_ELEMENT, MARKUP, NEWER, PAY_INVOICE, PICTURE } from "../src/adaptive-cards/story-data.js";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const SAMPLES = join(PKG, "test/fixtures/adaptive-cards/samples");
const samples = readdirSync(SAMPLES).filter((f) => f.endsWith(".json")).sort();
const tmp = mkdtempSync(join(tmpdir(), "adaptive-cards-"));
let browser, appJs, server, base;

/* The card with every remote image or poster swapped for the inline picture. */
function offline(card) {
  return JSON.parse(JSON.stringify(card), function (k, v) {
    if (typeof v === "string" && /^https?:/.test(v) && (k === "url" && this.type !== "Action.OpenUrl" && !this.mimeType || k === "iconUrl" || k === "poster" || k === "backgroundImage")) return PICTURE;
    return v;
  });
}

/* Pages are served over http, as an app's are, so the audit can read their stylesheets. */
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
before(async () => {
  browser = await chromium.launch();
  appJs = await bundleFixture("adaptive-cards-app", tmp);
  for (const s of SHEETS) copyFileSync(s, join(tmp, basename(s)));
  server = createServer((req, res) => {
    const file = join(tmp, normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (!file.startsWith(tmp) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await browser?.close(); server?.close(); rmSync(tmp, { recursive: true, force: true }); });

/* A page with the card in the fixture app; requests outside the page are recorded and refused. */
function pageFile(card, { width } = {}) {
  const name = `p-${Math.random().toString(36).slice(2)}.html`;
  writeFileSync(join(tmp, name), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Card</title>${SHEETS.map((s) => `<link rel="stylesheet" href="/${basename(s)}">`).join("")}<style>body{margin:0;padding:16px}</style></head><body><div id="root"></div><script>window.card = ${JSON.stringify(card).replace(/</g, "\\u003c")}</script><script src="/${appJs.slice(tmp.length + 1)}"></script></body></html>`);
  return `${base}/${name}${width ? `?width=${width}` : ""}`;
}
async function open(card, { width, scene = "card", viewport = 1000 } = {}) {
  const page = await browser.newPage({ viewport: { width: viewport, height: 900 } });
  page.outside = []; page.errors = [];
  await page.route("**/*", (r) => { const u = r.request().url(); if (/^(data|blob):/.test(u) || u.startsWith(base)) return r.continue(); page.outside.push(u); return r.abort(); });
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.goto(`${pageFile(card, { width })}#${scene}`);
  await page.locator(".piq-adaptive-card").first().waitFor();
  return page;
}
const calls = (page, name) => page.evaluate((n) => window.harness.calls.filter((c) => c.name === n).map((c) => c.args[0]), name);
const said = async (page) => (await page.locator(".piq-adaptive-card [data-announcer]").first().textContent()).trim();

describe("US-083: an agent's Adaptive Card renders in the app's theme", () => {
  // @covers US-083-AC1
  test("AC1: every element of schema 1.6 renders as the SDK component CONTRACT-004 maps it to, with no adaptivecards DOM", async () => {
    const page = await open(EVERY_ELEMENT, { width: 900 });
    const card = page.locator(".piq-adaptive-card");
    const el = (type) => card.locator(`[data-ac="${type}"]`);
    const count = async (loc) => loc.count();
    assert.equal(await page.locator('section.piq-card.piq-adaptive-card[data-ac="AdaptiveCard"]').count(), 1, "AdaptiveCard → Card");
    assert.equal(await card.locator("h3.piq-adaptive-card__heading").textContent(), "Every element", "TextBlock heading → a heading");
    const text = el("TextBlock").nth(1);
    assert.equal(await text.locator("strong").textContent(), "bold");
    assert.equal(await text.locator("li").count(), 2, "the markdown subset: a list");
    assert.equal(await el("RichTextBlock").locator("mark").count(), 1, "RichTextBlock/TextRun → text with highlight");
    assert.equal(await el("RichTextBlock").locator("s").count(), 1);
    assert.equal(await el("Image").locator('img[alt="A picture"]').count(), 1, "Image → img with altText");
    assert.equal(await el("ImageSet").locator(".piq-cluster img").count(), 2, "ImageSet → Cluster");
    assert.equal(await el("Media").locator('video[controls] track[kind="captions"]').count(), 1, "Media → video with captions");
    assert.equal(await card.locator('[data-ac="Container"][data-ac-style="good"] > .piq-stack').count(), 1, "Container → Stack on the status tokens");
    assert.equal(await el("ColumnSet").locator(".piq-grid .piq-adaptive-card__column").count(), 3, "ColumnSet → Grid");
    assert.equal(await el("FactSet").locator(".piq-description-list dt").first().textContent(), "Matter", "FactSet → DescriptionList");
    assert.equal(await el("Table").locator("table.piq-table th").first().textContent(), "Filing", "Table → DataTable");
    assert.equal(await count(card.getByRole("textbox", { name: "Name" })), 1, "Input.Text → TextField");
    assert.equal(await count(card.locator('[data-ac="Input.Text"] textarea.piq-field__input')), 1, "isMultiline → TextArea");
    assert.equal(await count(card.locator('[data-ac="Input.Number"] input[type="number"].piq-field__input')), 1);
    assert.equal(await count(card.locator('[data-ac="Input.Date"] input[type="date"].piq-field__input')), 1, "Input.Date → DatePicker");
    assert.equal(await count(card.locator('[data-ac="Input.Time"] input[type="time"]')), 1);
    assert.equal(await count(card.getByRole("checkbox", { name: "I agree to the terms" })), 1, "Input.Toggle → Checkbox");
    assert.equal(await count(card.getByRole("combobox", { name: "Size (compact)" })), 1, "ChoiceSet compact → Select");
    assert.equal(await count(card.locator("select.piq-select__input")), 1);
    assert.equal(await count(card.getByRole("group", { name: "Colour (expanded)" }).getByRole("radio")), 2, "expanded → RadioGroup");
    assert.equal(await count(card.locator('[data-ac="Input.ChoiceSet"] input[role="combobox"]')), 1, "filtered → Combobox");
    assert.equal(await count(card.getByRole("group", { name: "Extras (multi-select)" }).getByRole("checkbox")), 2, "isMultiSelect → checkboxes");
    assert.equal(await count(card.locator('[data-ac="ActionSet"] .piq-cluster .piq-btn')), 1, "ActionSet → Buttons in a Cluster");
    assert.equal(await count(card.locator('.piq-adaptive-card__actions button.piq-btn[data-ac-action="Action.Submit"]')), 1, "Submit → Button");
    assert.equal(await count(card.locator('.piq-adaptive-card__actions button.piq-btn[data-ac-action="Action.Execute"]')), 1, "Execute → Button");
    assert.equal(await count(card.locator('a.piq-btn[data-leaves-app][target="_blank"]')), 1, "OpenUrl → a link leaving the app");
    // ShowCard and ToggleVisibility are disclosures.
    const show = card.getByRole("button", { name: "Add a comment" });
    assert.equal(await show.getAttribute("aria-expanded"), "false");
    await show.click();
    assert.equal(await show.getAttribute("aria-expanded"), "true");
    assert.equal(await card.getByRole("region", { name: "Add a comment" }).getByRole("textbox", { name: "Comment" }).count(), 1);
    const toggle = card.getByRole("button", { name: "Show the details" });
    assert.equal(await card.getByText("The details, shown on request.").isVisible(), false);
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    await toggle.click();
    assert.equal(await card.getByText("The details, shown on request.").isVisible(), true);
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    assert.ok((await toggle.getAttribute("aria-controls")).length > 0);
    // No element of the adaptivecards DOM renderer (its classes start ac-).
    assert.equal(await page.evaluate(() => [...document.querySelectorAll("*")].filter((e) => [...e.classList].some((c) => /^ac-/.test(c))).length), 0);
    assert.deepEqual(page.errors, []);
    assert.deepEqual(page.outside, []);
    await page.close();
  });

  // @covers US-083-AC1
  test("AC1: the official 1.6 sample cards render every 1.6 element with SDK widgets, and nothing else", async () => {
    const seen = new Set();
    const KNOWN = new Set(["TextBlock", "RichTextBlock", "Image", "ImageSet", "Media", "Container", "ColumnSet", "Column", "FactSet", "Table", "ActionSet", "Input.Text", "Input.Number", "Input.Date", "Input.Time", "Input.Toggle", "Input.ChoiceSet"]);
    for (const f of samples) {
      const page = await open(offline(JSON.parse(readFileSync(join(SAMPLES, f), "utf8"))), { width: 700 });
      for (const t of await page.evaluate(() => [...document.querySelectorAll("[data-ac]")].map((e) => e.dataset.ac))) seen.add(t);
      for (const t of await page.evaluate(() => [...document.querySelectorAll("[data-ac-action]")].map((e) => e.dataset.acAction))) seen.add(t);
      if (await page.locator('a[data-leaves-app].piq-btn').count()) seen.add("Action.OpenUrl");
      // Only elements outside 1.6 (Carousel, the fallback tests' made-up ones) become a notice.
      const unsupported = await page.evaluate(() => [...document.querySelectorAll("[data-ac-unsupported]")].map((e) => e.dataset.acUnsupported));
      for (const u of unsupported) assert.ok(!KNOWN.has(u), `${f}: ${u} should render`);
      assert.equal(await page.evaluate(() => [...document.querySelectorAll("*")].filter((e) => [...e.classList].some((c) => /^ac-/.test(c))).length), 0, f);
      assert.deepEqual(page.errors, [], f);
      assert.deepEqual(page.outside, [], f);
      await page.close();
    }
    for (const t of [...KNOWN, "AdaptiveCard", "Action.Submit", "Action.Execute", "Action.OpenUrl", "Action.ShowCard", "Action.ToggleVisibility"]) assert.ok(seen.has(t), `the samples cover ${t}`);
  });

  // @covers US-083-AC2
  test("AC2: the card's colours, type and spacing follow the theme and appearance; the card's own styling is limited to the schema's semantic styles", async () => {
    const page = await open({ ...EVERY_ELEMENT, body: [...EVERY_ELEMENT.body, { type: "Image", url: PICTURE, altText: "Red?", backgroundColor: "#FF0000" }] }, { width: 700 });
    const look = () => page.evaluate(() => {
      const card = document.querySelector(".piq-adaptive-card"), h = card.querySelector(".piq-adaptive-card__heading"), good = card.querySelector('[data-ac-style="good"]'), el = card.querySelectorAll(".piq-adaptive-card__el")[1];
      const cs = (e) => getComputedStyle(e);
      const probe = document.createElement("i"); probe.style.color = "var(--piq-color-status-positive)"; good.append(probe); const positive = cs(probe).color; probe.remove();
      return { bg: cs(card).backgroundColor, text: cs(h).color, font: cs(h).fontFamily, size: cs(h).fontSize, stripe: cs(good).borderInlineStartColor, gap: cs(el).marginBlockStart, positive };
    });
    const switchTo = (theme, appearance) => page.evaluate(([t, a]) => window.dispatchEvent(new CustomEvent("piq:set-theme", { detail: { theme: t, appearance: a } })), [theme, appearance]);
    const light = await look();
    await switchTo("praxis-carbon", "dark");
    await page.waitForFunction(() => document.querySelector("[data-theme]").dataset.appearance === "dark");
    const dark = await look();
    assert.notEqual(dark.bg, light.bg, "the surface follows the appearance");
    assert.notEqual(dark.text, light.text, "the text colour follows the appearance");
    assert.notEqual(dark.stripe, light.stripe, "the good style's tone follows the appearance");
    for (const [ap, v] of [["light", light], ["dark", dark]]) assert.equal(v.stripe, v.positive, `the good style is the theme's status-positive in ${ap}`);
    const other = (await page.evaluate(() => [...new Set([...document.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch { return []; } }).flatMap((r) => [...(r.selectorText ?? "").matchAll(/\[data-theme="([^"]+)"\]/g)].map((m) => m[1])))])).find((t) => t !== "praxis-carbon");
    await switchTo(other, "light");
    await page.waitForFunction((t) => document.querySelector("[data-theme]").dataset.theme === t, other);
    const themed = await look();
    assert.ok(themed.font !== light.font || themed.size !== light.size || themed.gap !== light.gap || themed.bg !== light.bg, `${other}: the type, spacing or surface change with the theme`);
    // The card sets no colour, font or radius of its own: its inline styles are only sizes and the column tracks.
    const styles = await page.evaluate(() => [...document.querySelectorAll(".piq-adaptive-card [style]")].flatMap((e) => [...e.style].map((p) => p)));
    for (const p of styles) assert.ok(["inline-size", "block-size", "min-block-size", "--_ac-cols", "--_ac-lines", "width", "height", "min-height"].includes(p), `inline style ${p}`);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll(".piq-adaptive-card *")].some((e) => getComputedStyle(e).backgroundColor === "rgb(255, 0, 0)")), false, "backgroundColor is not the card's to set");
    await page.close();
  });

  // @covers US-083-AC3
  test("AC3: at a compact width a ColumnSet stacks into one column, and nothing scrolls sideways", async () => {
    const boxes = (page) => page.evaluate(() => [...document.querySelectorAll('[data-ac="ColumnSet"] .piq-adaptive-card__column')].map((c) => { const r = c.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }; }));
    const narrow = await open(COLUMNS, { width: 360, viewport: 400 });
    const b = await boxes(narrow);
    assert.equal(b.length, 3);
    assert.ok(b.every((x) => x.x === b[0].x), "one column: every column starts at the same x");
    assert.ok(b[1].y > b[0].y && b[2].y > b[1].y, "stacked in order");
    assert.ok(await narrow.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "no sideways scroll");
    assert.ok(await narrow.evaluate(() => { const c = document.querySelector(".piq-adaptive-card"); return c.scrollWidth <= c.clientWidth; }));
    await narrow.close();
    const wide = await open(COLUMNS, { width: 900 });
    const w = await boxes(wide);
    assert.ok(w[1].x > w[0].x && w[2].x > w[1].x && w.every((x) => x.y === w[0].y), "side by side from medium");
    assert.ok(w[0].w <= 121, "a pixel width is kept");
    await wide.close();
    // The official samples at a phone width do not scroll sideways either.
    for (const f of ["v1.5-Scenarios-WeatherLarge.json", "v1.5-Scenarios-FlightItinerary.json", "v1.5-Scenarios-ExpenseReport.json"]) {
      const page = await open(offline(JSON.parse(readFileSync(join(SAMPLES, f), "utf8"))), { width: 320, viewport: 360 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), f);
      await page.close();
    }
  });

  // @covers US-083-AC4
  test("AC4: an element outside 1.6 shows its fallback, or a plain notice; a newer version says so; nothing is inserted as HTML", async () => {
    const page = await open(NEWER);
    const card = page.locator(".piq-adaptive-card");
    assert.match(await card.locator(".piq-notice").textContent(), /uses Adaptive Cards 1\.7/);
    assert.equal(await card.locator('[data-ac-unsupported="Carousel"]').textContent(), "This content could not be shown.");
    assert.equal(await card.getByText("New (shown as text)").count(), 1, "Badge → its fallback");
    assert.equal(await card.getByText("A chart, as text").count(), 1, "a fallback's own fallback");
    assert.equal(await card.locator('[data-ac-unsupported="Rating"]').count(), 0, 'fallback "drop" drops it');
    assert.equal(await card.getByText("A page").count(), 0, "nothing from inside the unknown element");
    assert.equal(await card.locator("script, iframe, object, embed").count(), 0);
    await page.close();
  });

  // @covers US-083-AC5
  test("AC5: only the markdown subset is formatted; HTML and script show as text", async () => {
    const page = await open(MARKUP);
    const card = page.locator(".piq-adaptive-card");
    const md = card.locator('[data-ac="TextBlock"]').nth(1);
    assert.equal(await md.locator("strong").textContent(), "Bold");
    assert.equal(await md.locator("em").textContent(), "italic");
    assert.equal(await md.locator('a[href="https://example.com/"][target="_blank"]').count(), 1);
    assert.match(await md.locator("a").first().textContent(), /\(opens in a new tab\)/);
    assert.equal(await md.locator("a").count(), 1, "a javascript: link is not a link");
    assert.match(await md.textContent(), /\[a bad link\]\(javascript:alert\(1\)\)/);
    const html = card.locator('[data-ac="TextBlock"]').nth(2);
    assert.match(await html.textContent(), /<b>not bold<\/b> <img src=x onerror="window\.pwned=1"> <script>window\.pwned=2<\/script>/);
    assert.equal(await card.locator("b, script, img").count(), 0, "no element from the text");
    assert.equal(await page.evaluate(() => window.pwned), undefined);
    assert.match(await card.locator('[data-ac="TextBlock"]').nth(3).textContent(), /Hello \$\{name\}, # not a heading/, "a template and other markdown show as text");
    await page.close();
  });

  // @covers US-083-AC6
  test("AC6: the card is marked generated, and the audit reports no errors on the cards and samples in light and dark", async () => {
    const page = await open(CLEAN);
    assert.equal(await page.locator('.piq-adaptive-card[data-piq-ai="generated"]').count(), 1);
    assert.ok(await page.locator(".piq-adaptive-card").getAttribute("aria-describedby"), "its disclosure is tied to it");
    await page.close();
    const conv = await open(PAY_INVOICE, { scene: "conversation" });
    assert.equal(await conv.locator('[data-piq-ai-label] .piq-message__content[data-piq-ai="generated"] .piq-adaptive-card[data-piq-ai="generated"]').count(), 1, "inside a conversation, under its disclosure");
    await conv.close();
    const cards = [CLEAN, PAY_INVOICE, EVERY_ELEMENT, DESTRUCTIVE, COLUMNS, ...samples.map((f) => offline(JSON.parse(readFileSync(join(SAMPLES, f), "utf8"))))];
    const urls = cards.map((c) => pageFile(c, { width: 700 }));
    const r = await audit({ urls, themes: ["praxis-carbon"], appearances: ["light", "dark"], wait: ".piq-adaptive-card", rules: { brand: false }, cwd: PKG });
    const errors = r.findings.filter((f) => f.severity === "error").map((f) => `${f.check} ${f.url.replace(/.*\//, "")} ${f.selector ?? ""}: ${f.message}`);
    assert.deepEqual(errors, []);
    assert.equal(r.runs.length, urls.length * 2);
  });
});

describe("US-085: card actions call the app, with approval when high-impact", () => {
  // @covers US-085-AC1
  test("AC1: Submit and Execute call onAction with their type, id or verb, data and the card's inputs; invalid inputs stop it", async () => {
    const page = await open(PAY_INVOICE);
    await page.getByRole("spinbutton", { name: /Amount/ }).fill("95");
    await page.getByRole("button", { name: "Save for later" }).click();
    assert.deepEqual(await calls(page, "action"), [{ type: "Action.Submit", data: { invoice: "INV-2041", intent: "later" }, inputs: { amount: "95" } }]);
    // A required input left empty: its error message, focus on it, and no call.
    await page.getByRole("spinbutton", { name: /Amount/ }).fill("");
    await page.getByRole("button", { name: "Save for later" }).click();
    assert.equal(await page.getByText("Enter an amount of £1 or more.").count(), 1);
    assert.equal(await page.getByRole("spinbutton", { name: /Amount/ }).getAttribute("aria-invalid"), "true");
    assert.equal(await page.evaluate(() => document.activeElement.type), "number");
    assert.equal((await calls(page, "action")).length, 1);
    await page.close();
    const every = await open(EVERY_ELEMENT, { width: 900 });
    await every.getByRole("textbox", { name: "Name" }).fill("Ada");
    await every.getByRole("checkbox", { name: "I agree to the terms" }).check();
    await every.getByRole("combobox", { name: "Size (compact)" }).selectOption("l");
    await every.getByRole("radio", { name: "Blue" }).check();
    await every.getByRole("checkbox", { name: "Sugar" }).check();
    await every.getByRole("button", { name: "Run the check" }).click();
    const [run] = await calls(every, "action");
    assert.deepEqual({ type: run.type, verb: run.verb, data: run.data }, { type: "Action.Execute", verb: "check", data: { form: "every" } });
    assert.deepEqual([run.inputs.name, run.inputs.agree, run.inputs.size, run.inputs.colour, run.inputs.extras, run.inputs.note], ["Ada", "true", "l", "blue", "sugar", ""]);
    assert.ok(!("comment" in run.inputs), "a ShowCard's inputs belong to its own actions");
    await every.close();
  });

  // @covers US-085-AC2
  test("AC2: a high-impact action asks for approval stating its consequence; onAction only after Approve, never after Deny", async () => {
    const deny = await open(PAY_INVOICE);
    await deny.getByRole("spinbutton", { name: /Amount/ }).fill("120");
    await deny.getByRole("button", { name: "Pay invoice" }).click();
    const approval = deny.locator('[data-piq-ai="approval"]');
    assert.equal(await approval.locator(".piq-approval__summary").textContent(), "Pay £120.00 to Acme Ltd");
    assert.equal(await approval.locator('[data-piq-ai-control="approve"]').textContent(), "Approve");
    assert.equal(await approval.locator('[data-piq-ai-control="deny"]').textContent(), "Deny");
    assert.notEqual(await deny.evaluate(() => document.activeElement.dataset.piqAiControl), "approve", "neither is focused for the user");
    assert.deepEqual(await calls(deny, "action"), [], "nothing before the user chooses");
    await approval.getByRole("button", { name: "Deny" }).click();
    assert.deepEqual(await calls(deny, "action"), [], "never after Deny");
    assert.deepEqual(await calls(deny, "decide"), [{ action: "pay", decision: "denied" }]);
    await deny.close();
    const yes = await open(PAY_INVOICE);
    await yes.getByRole("button", { name: "Pay invoice" }).click();
    await yes.getByRole("button", { name: "Approve" }).click();
    assert.deepEqual(await calls(yes, "action"), [{ type: "Action.Execute", verb: "pay", data: { invoice: "INV-2041" }, inputs: { amount: "120" } }], "the ux-builder marker is removed from data");
    await yes.close();
    // A marked action with no consequence states its title and the card's title.
    const bare = structuredClone(PAY_INVOICE);
    delete bare.actions[0].data["ux-builder"].consequence;
    const page = await open(bare);
    await page.getByRole("button", { name: "Pay invoice" }).click();
    assert.equal(await page.locator(".piq-approval__summary").textContent(), "Pay invoice: Invoice INV-2041 from Acme Ltd");
    await page.close();
  });

  // @covers US-085-AC3
  test("AC3: the choice is announced and recorded; the card's actions are no longer available, and a second activation is refused", async () => {
    const page = await open(PAY_INVOICE);
    await page.getByRole("button", { name: "Pay invoice" }).click();
    assert.equal(await said(page), "Approval needed: Pay £120.00 to Acme Ltd");
    await page.getByRole("button", { name: "Approve" }).click();
    assert.equal(await said(page), "Approved: Pay £120.00 to Acme Ltd");
    assert.equal(await page.locator(".piq-approval__status").textContent(), "Approved by you");
    assert.equal(await page.locator('[data-piq-ai-control="approve"]').count(), 0);
    for (const name of ["Pay invoice", "Save for later"]) assert.equal(await page.getByRole("button", { name }).getAttribute("aria-disabled"), "true", name);
    assert.equal(await page.getByRole("spinbutton", { name: /Amount/ }).isDisabled(), true);
    // Activated again (aria-disabled buttons still take a click), they are refused.
    await page.getByRole("button", { name: "Pay invoice" }).click({ force: true });
    await page.getByRole("button", { name: "Save for later" }).click({ force: true });
    assert.equal(await page.locator(".piq-adaptive-card__status").textContent(), "This card is no longer current.");
    assert.equal(await said(page), "This card is no longer current.");
    assert.equal((await calls(page, "action")).length, 1, "only the approved action reached the app");
    await page.close();
    // In a conversation: the part's claim that the user approved is ignored; the user's own choice is recorded with the message.
    const conv = await open(PAY_INVOICE, { scene: "conversation" });
    await conv.getByRole("button", { name: "Pay invoice" }).click();
    assert.equal(await conv.locator('[data-piq-ai="approval"] [data-piq-ai-control="approve"]').count(), 1, "still asks, whatever the tool result claims");
    assert.deepEqual(await calls(conv, "cardAction"), []);
    await conv.getByRole("button", { name: "Deny" }).click();
    assert.deepEqual(await calls(conv, "cardDecide"), [{ messageId: "a1", partId: "invoice", action: "pay", decision: "denied" }]);
    assert.deepEqual(await calls(conv, "cardAction"), []);
    assert.equal(await conv.locator(".piq-approval__status").textContent(), "Denied by you");
    await conv.close();
    // A marker in the card claiming approval is not read either.
    const claimed = structuredClone(PAY_INVOICE);
    Object.assign(claimed.actions[0].data["ux-builder"], { approved: true, decision: "approved" });
    const c = await open(claimed);
    await c.getByRole("button", { name: "Pay invoice" }).click();
    assert.deepEqual(await calls(c, "action"), []);
    assert.equal(await c.locator('[data-piq-ai-control="approve"]').count(), 1);
    await c.close();
  });

  // @covers US-085-AC4
  test("AC4: a destructive action has the destructive emphasis, and asks to confirm before onAction", async () => {
    const page = await open(DESTRUCTIVE);
    const discard = page.getByRole("button", { name: "Discard draft" });
    assert.equal(await discard.getAttribute("data-style"), "destructive");
    const [edge, closed] = await page.evaluate(() => { const b = document.querySelector('[data-style="destructive"]'); const probe = document.createElement("i"); probe.style.color = "var(--piq-color-status-negative)"; b.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return [getComputedStyle(b).borderTopColor, c]; });
    assert.equal(edge, closed, "the destructive emphasis is the theme's loss tone");
    await discard.click();
    const dialog = page.getByRole("alertdialog", { name: "Discard draft?" });
    await dialog.waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "Cancel", "focus starts on Cancel");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    assert.deepEqual(await calls(page, "action"), []);
    await discard.click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Discard draft" }).click();
    assert.deepEqual(await calls(page, "action"), [{ type: "Action.Submit", data: { draft: "D-7" }, inputs: {} }]);
    await page.close();
  });

  // @covers US-085-AC5
  test("AC5: Action.OpenUrl is a link marked as leaving the app, never a request from the app", async () => {
    const page = await open({ ...CLEAN, actions: [...CLEAN.actions, { type: "Action.OpenUrl", title: "Open the menu", url: "https://example.com/menu" }, { type: "Action.OpenUrl", title: "Run a script", url: "javascript:alert(1)" }] });
    const link = page.getByRole("link", { name: /Open the menu/ });
    assert.equal(await link.getAttribute("href"), "https://example.com/menu");
    assert.equal(await link.getAttribute("target"), "_blank");
    assert.match(await link.getAttribute("rel"), /noopener/);
    assert.match(await link.textContent(), /\(opens in a new tab\)/);
    assert.equal(await link.locator(".piq-icon, svg").count() > 0, true, "the external-link mark");
    assert.equal(await page.getByRole("link", { name: /Run a script/ }).count(), 0, "a javascript: URL is not a link");
    const popup = page.waitForEvent("popup");
    await link.click();
    await (await popup).close();
    assert.deepEqual(await calls(page, "action"), [], "it never calls onAction");
    assert.deepEqual(page.outside, [], "the app makes no request for it");
    await page.close();
  });
});
