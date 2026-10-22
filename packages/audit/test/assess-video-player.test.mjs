/* Walkthrough videos: the interactive player, video/index.html (FEAT-013
   OUT-04, ANN-01, ANN-02; ADR-031 decisions 3 and 7; US-095).

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, describe, test } from "node:test";
import { chromium } from "playwright";
import { audit } from "../audit.mjs";
import { captionMarkup } from "../assess/video-player.mjs";
import { videoApp } from "./fixtures/video-app.mjs";

let app, p, f, browser;
before(async () => {
  app = await videoApp();
  p = app.pkg();
  f = app.walked(p);
  // The same problem seen in another journey (its key), for "Also in".
  const backlog = p.read("backlog.json");
  backlog.findings.push(p.finding({ ...f.both, id: undefined, journey_id: "J-undo", evidence_refs: [] , uncertainty: "seen in passing" }));
  p.write("backlog.json", backlog);
  await app.run(p, { journeys: ["J-review"] });
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); app?.close(); });

const PLAYER = () => pathToFileURL(join(p.dir, "video", "index.html")).href;
async function open({ width = 1400, offline = true, hash = "" } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  if (offline) await context.setOffline(true);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(PLAYER() + hash);
  await page.waitForFunction(() => window.__player?.video.readyState >= 1);
  return { page, errors, close: () => context.close() };
}
const annotations = () => p.read("video/J-review.annotations.json").annotations;
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("US-095: explore the findings in an interactive player", () => {
  // @covers US-095-AC1
  test("AC1: from the file system with the network off, the recording plays and its chapters and findings are listed", async () => {
    const { page, errors, close } = await open();
    try {
      await page.click("#play");
      await page.waitForFunction(() => window.__player.video.currentTime > 0.2);
      const chapters = await page.locator("#chapters a").allInnerTexts();
      assert.deepEqual(chapters.map((c) => c.replace(/^\d+:\d+ · /, "")).filter((c) => !/^J-review · step \d+: /.test(c)), ["Title card", "Main path", "Alternate 1", "End"]);
      assert.deepEqual(chapters.map((c) => c.replace(/^\d+:\d+ · /, "")).filter((c) => /^J-review · step /.test(c)).slice(0, 2), ["J-review · step 1: /queue", "J-review · step 2: /entry/1"], "a chapter per step");
      const listed = await page.locator("#findings a").allInnerTexts();
      assert.equal(listed.length, 2);
      assert.match(listed[1], /P1 · Checked · Approve and Reject look equally important/);
      assert.deepEqual(errors, []);
      assert.ok(!/https?:\/\//.test(readFileSync(join(p.dir, "video/index.html"), "utf8").replace(/http:\/\/www\.w3\.org\/2000\/svg/g, "")), "no network address in the page");
    } finally { await close(); }
  });

  // @covers US-095-AC2
  test("AC2: an annotation shows the MP4's caption, with outlines placed on its boxes at 480, 960 and 1440 px", async () => {
    const a = annotations().find((x) => x.finding === f.both.id);
    for (const width of [480 + 48, 960 + 400, 1440 + 400]) {
      const { page, close } = await open({ width });
      try {
        await page.evaluate((k) => window.__player.seekTo(window.__player.current.annotations.find((x) => x.finding === k)), a.finding);
        await page.waitForSelector("#popup:not([hidden]) .cap");
        assert.equal(text(await page.locator("#popup .cap").evaluate((e) => e.outerHTML)), text(captionMarkup(a)), "the same caption");
        const v = await page.locator("#video").boundingBox();
        const outlines = await page.locator("#overlay .outline").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
        assert.equal(outlines.length, a.boxes.length);
        const s = v.width / 1440;
        for (const [i, b] of a.boxes.entries()) {
          const o = outlines[i];
          assert.ok(Math.abs(o.x + 4 - (v.x + b.x * s)) <= 2 && Math.abs(o.y + 4 - (v.y + b.y * s)) <= 2, `outline ${i} on its box at ${v.width}px`);
          assert.ok(Math.abs(o.width - 8 - b.width * s) <= 2 && Math.abs(o.height - 8 - b.height * s) <= 2);
        }
      } finally { await close(); }
    }
  });

  // @covers US-095-AC3
  test("AC3: with auto-pause on, playback pauses at a pop-up until dismissed; off, it shows for its range and plays on", async () => {
    const first = annotations()[0];
    const { page, close } = await open();
    try {
      await page.click("#play");
      await page.waitForFunction(() => window.__player.shown && window.__player.video.paused, null, { timeout: 15_000 });
      assert.equal(await page.evaluate(() => window.__player.shown.finding), first.finding);
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => window.__player.video.paused), true, "still paused");
      await page.click("#dismiss");
      await page.waitForFunction(() => !window.__player.video.paused && !window.__player.shown);
      // Off: it shows during its range, and playback does not stop.
      await page.click("#auto");
      assert.equal(await page.getAttribute("#auto", "aria-pressed"), "false");
      await page.evaluate((t) => { const v = window.__player.video; v.currentTime = t; v.play(); }, Math.max(0, first.start - 0.3));
      await page.waitForFunction(() => window.__player.shown, null, { timeout: 10_000 });
      assert.equal(await page.evaluate(() => window.__player.video.paused), false);
      await page.waitForFunction(() => !window.__player.shown, null, { timeout: 10_000 });
    } finally { await close(); }
  });

  // @covers US-095-AC4
  test("AC4: More shows the checkpoint's screenshot, confidence and other journeys; Open in report goes to the finding", async () => {
    const { page, close } = await open();
    try {
      await page.evaluate((k) => window.__player.seekTo(window.__player.current.annotations.find((x) => x.finding === k)), f.both.id);
      await page.click("#more");
      assert.equal(await page.getAttribute("#more", "aria-expanded"), "true");
      const panel = page.locator("#more-panel");
      assert.equal(await panel.isVisible(), true);
      assert.equal(await panel.locator("img").getAttribute("src"), "../checkpoints/C-review-2/screenshot.png");
      assert.match(await panel.innerText(), /Confidence: high: seen at two checkpoints/);
      assert.match(await panel.innerText(), /Also in: J-undo/);
      assert.equal(await page.getAttribute("#popup a", "href"), `../report.html#${f.both.id}`);
    } finally { await close(); }
  });

  // @covers US-095-AC5
  test("AC5: the findings list filters by priority and by kind, and choosing one seeks to it and shows it", async () => {
    const { page, close } = await open();
    try {
      await page.selectOption("#f-kind", "judgment");
      assert.deepEqual((await page.locator("#findings a").allInnerTexts()).map((t) => /· (Checked|Judgment) ·/.exec(t)[1]), ["Judgment"]);
      await page.selectOption("#f-kind", "all");
      await page.selectOption("#f-priority", "P1");
      const only = page.locator("#findings a");
      assert.equal(await only.count(), 1);
      await only.click();
      const a = annotations().find((x) => x.finding === f.both.id);
      await page.waitForFunction((k) => window.__player.shown?.finding === k, a.finding);
      const t = await page.evaluate(() => window.__player.video.currentTime);
      assert.ok(Math.abs(t - a.start) < 0.1, `seeked to ${a.start} (${t})`);
      assert.match(page.url(), new RegExp(`#J-review@${a.start}$`), "a link to the moment");
      // A link to a moment opens there.
      const { page: again, close: close2 } = await open({ hash: `#J-review@${a.start}` });
      try { await again.waitForFunction((s) => Math.abs(window.__player.video.currentTime - s) < 0.1, a.start); } finally { await close2(); }
    } finally { await close(); }
  });

  // @covers US-095-AC6
  test("AC6: keyboard only, announced to a screen reader, and no audit errors", async () => {
    const { page, close } = await open();
    try {
      await page.locator("body").focus();
      await page.keyboard.press("n");
      await page.waitForFunction(() => window.__player.shown);
      const first = await page.evaluate(() => window.__player.shown.finding);
      assert.match(await page.locator("#announce").innerText(), /^(Checked|Judgment), P\d: /);
      assert.equal(await page.getAttribute("#announce", "aria-live"), "polite");
      await page.keyboard.press("m");
      assert.equal(await page.locator("#more-panel").isVisible(), true);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !window.__player.shown);
      await page.keyboard.press("n");
      await page.waitForFunction((k) => window.__player.shown && window.__player.shown.finding !== k, first);
      await page.keyboard.press("p");
      await page.waitForFunction((k) => window.__player.shown?.finding === k, first);
      await page.locator("body").focus();
      await page.keyboard.press("k");
      await page.waitForFunction(() => !window.__player.video.paused);
      await page.keyboard.press("k");
      await page.waitForFunction(() => window.__player.video.paused);
      // Every control is reachable by Tab.
      for (const id of ["journey", "prev", "play", "next", "auto", "f-priority", "f-kind"]) assert.equal(await page.locator(`#${id}`).evaluate((e) => e.tabIndex >= 0 && !e.disabled), true, id);
    } finally { await close(); }
    // The player is audited like any SDK page.
    const root = p.dir;
    const srv = createServer((q, r) => { const file = join(root, decodeURIComponent(new URL(q.url, "http://x").pathname)); if (!existsSync(file)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": file.endsWith(".html") ? "text/html" : file.endsWith(".webm") ? "video/webm" : "application/octet-stream" }); r.end(readFileSync(file)); });
    await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
    try {
      const report = await audit({ urls: [`http://127.0.0.1:${srv.address().port}/video/index.html`], themes: ["ux-builder-databricks"] });
      assert.equal(report.summary.error, 0, JSON.stringify(report.findings.filter((x) => x.severity === "error")));
      assert.deepEqual(report.findings.filter((x) => x.severity === "warning").map((x) => x.rule), []);
    } finally { srv.close(); }
  });
});
