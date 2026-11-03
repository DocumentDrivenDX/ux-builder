/* US-164: the plate and the presentation, and the player in a real browser. */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { render } from "../node.mjs";
import { fixture } from "./helpers.mjs";

const offline = (html) => html.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, "");
let browser, dir;
before(async () => { browser = await chromium.launch(); dir = mkdtempSync(join(tmpdir(), "uxb-pages-")); });
after(async () => { await browser?.close(); rmSync(dir, { recursive: true, force: true }); });

test("@covers US-164-AC1 a plate holds the takeaway, the visual, the numbered steps, the legend, the source and the omissions, offline", async () => {
  const doc = fixture("beacon-field-guide");
  const v = doc.extensions["umf.visual"];
  v.omissions = ["The job workers; see the containers view."];
  const { content } = await render(doc, { theme: "praxis", output: "plate" });
  assert.match(content, /^<!doctype html>/);
  assert.ok(content.includes(`<h1>${v.title}</h1>`), "the title is the headline");
  assert.ok(content.includes(`<p>${v.takeaway}</p>`), "the takeaway is the lede");
  assert.match(content, /<svg [^>]*class="uxb-visual uxb-visual--flow-lanes"/);
  // Each step is led by its line's why, as a sentence.
  const why = new Map(v.edges.map((e) => [e.id, e.why]));
  for (const s of v.steps.filter((x) => !x.when)) assert.match(content, new RegExp(`<li><strong>${why.get(s.focus[0])[0].toUpperCase()}${why.get(s.focus[0]).slice(1)}\\.</strong>`), s.title);
  assert.match(content, /<div class="uxb-legend">.*Beacon API's own code/s);
  assert.match(content, /Authority: <code>umf:fixtures\/visual\/sources\/beacon\/architecture-model\.toml<\/code>, view <code>field-guide<\/code>/);
  assert.match(content, /<p>The job workers; see the containers view\.<\/p>/);
  assert.doesNotMatch(offline(content), /https?:|@import|<link|src=/);
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  writeFileSync(join(dir, "plate.html"), content);
  await page.goto(`file://${join(dir, "plate.html")}`);
  assert.equal(await page.locator(".uxb-notes ol li").count(), v.steps.filter((x) => !x.when).length);
  assert.deepEqual(errors, []);
  await page.close();
});

test("@covers US-164-AC2 a presentation walks the steps with the buttons and the arrow keys, focusing each step's items", async () => {
  const doc = fixture("beacon-reply-presentation");
  const v = doc.extensions["umf.visual"];
  const { content } = await render(doc, { theme: "databricks", appearance: "dark", output: "presentation" });
  assert.doesNotMatch(offline(content), /https?:|@import|<link|src=/);
  writeFileSync(join(dir, "presentation.html"), content);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`file://${join(dir, "presentation.html")}`);
  const count = page.locator("#uxb-count"), title = page.locator("#uxb-title");
  assert.equal(await count.textContent(), `${v.steps.length} steps`);
  assert.equal(await page.locator("#uxb-prev").isDisabled(), true);
  const full = await page.locator(".uxb-stage svg").getAttribute("viewBox");
  await page.keyboard.press("ArrowRight");
  assert.equal(await count.textContent(), `1 / ${v.steps.length}`);
  assert.equal(await title.textContent(), v.steps[0].title);
  const focused = await page.locator(".uxb-stage svg .uxb-is-focus").evaluateAll((els) => els.map((e) => e.id));
  for (const id of v.steps[0].focus) assert.ok(focused.includes(`${v.id}--${id}`), `${id} focused`);
  assert.notEqual(await page.locator(".uxb-stage svg").getAttribute("viewBox"), full, "the view moves to the step");
  await page.locator("#uxb-next").click();
  assert.equal(await title.textContent(), v.steps[1].title);
  await page.keyboard.press("End");
  assert.equal(await count.textContent(), `${v.steps.length} / ${v.steps.length}`);
  assert.equal(await page.locator("#uxb-next").isDisabled(), true);
  await page.keyboard.press("Home");
  assert.equal(await page.locator(".uxb-stage svg").getAttribute("viewBox"), full);
  assert.equal(await page.locator("[aria-live=polite]").count(), 1);
  assert.deepEqual(errors, []);
  await page.close();
});

test("@covers US-164-AC3 a presentation of a visual with no steps is refused", async () => {
  await assert.rejects(render(fixture("helix-context"), { theme: "praxis", output: "presentation" }), (e) => e.code === "VISUAL_NO_STEPS");
});

test("@covers US-164-AC4 a step outside the sequence follows the numbered steps, led by when it happens", async () => {
  const doc = fixture("beacon-field-guide");
  const v = doc.extensions["umf.visual"];
  const { content } = await render(doc, { theme: "praxis", output: "plate" });
  assert.match(content, /<p class="uxb-aside"><strong>Throughout: every draft and every send is traced back to the agent who asked\.<\/strong>/);
  assert.match(content, /numbered steps in order, and the call that runs throughout/);
  assert.ok(content.indexOf("</ol>") < content.indexOf('class="uxb-aside"'), "after the numbered list");
  v.steps.at(-1).tag = "ALWAYS ON";
  const tagged = await render(doc, { theme: "praxis", output: "plate" });
  assert.match(tagged.content, /<strong>Always on: every draft and every send is traced back to the agent who asked\.<\/strong>/);
  assert.match(tagged.content, /the call that is marked ALWAYS ON/);
});
