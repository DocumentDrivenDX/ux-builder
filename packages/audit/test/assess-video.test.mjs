/* Walkthrough videos: the replay recorder and its annotation timeline
   (FEAT-013 REP-02 to REP-06, ANN-01, ANN-02, ANN-04, OUT-01, PRV-01 to
   PRV-03; ADR-031; US-091, US-093).

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { chromium } from "playwright";
import { layer } from "../assess/video-layer.mjs";
import { plain, signedIn, videoApp } from "./fixtures/video-app.mjs";

let app, hits, base, pkg, walked, run;
before(async () => { app = await videoApp(); ({ hits, base, pkg, walked, run } = app); });
after(() => app?.close());
const timeline = (p, name = "J-review") => p.read(`video/${name}.annotations.json`);

describe("US-091: watch a journey with its usability problems", () => {
  let p, f, r, hitsBefore, resetsBefore;
  before(async () => {
    p = pkg();
    f = walked(p);
    hitsBefore = hits.length; resetsBefore = app.state.resets;
    r = await run(p);
  });

  // @covers US-091-AC1
  test("AC1: one video per walked journey, each opening on a title card naming the app, journey, story, role, viewport and run", () => {
    const v = p.read("video/video.json");
    assert.deepEqual(v.videos.map((x) => x.journey), ["J-review", "J-undo"]);
    for (const x of v.videos) {
      assert.ok(statSync(join(p.dir, "video", x.files.clean)).size > 1000, `${x.files.clean} is a recording`);
      assert.equal(x.chapters[0].kind, "title");
      assert.equal(x.chapters.at(-1).kind, "end");
    }
    const t = v.videos[0].chapters[0].title;
    for (const part of ["Review app", "J-review", "US-001", "role reviewer", "1440×900", `run ${p.run}`]) assert.ok(t.includes(part), `${part} in "${t}"`);
    assert.equal(p.cli("validate-report", p.dir).status, 0, p.cli("validate-report", p.dir).stdout);
  });

  // @covers US-091-AC4
  test("AC4: a step that no longer replays stops its chapter, shows none of its later findings, and the stage is partial", () => {
    const undo = p.read("video/video.json").videos.find((x) => x.journey === "J-undo");
    const main = undo.chapters.find((c) => c.kind === "main");
    assert.equal(main.status, "stopped");
    assert.match(main.reason, /^step 2 \(Press Undo\) no longer replays/);
    const tl = timeline(p, "J-undo");
    assert.ok(tl.annotations.every((a) => a.end <= main.end), "nothing after the stop");
    assert.equal(r.code, 1);
    assert.equal(r.stage.status, "partial");
    assert.match(p.read("run.json").stages.find((s) => s.stage === "video").reason, /J-undo Main path: step 2/);
  });

  // @covers US-091-AC5
  test("AC5: the main path and each walked alternate are chapters of one recording, the fixture reset between them", () => {
    const tl = timeline(p);
    assert.deepEqual(tl.chapters.map((c) => [c.id, c.kind, c.status]), [["title", "title", "recorded"], ["main", "main", "recorded"], ["alternate-1", "alternate", "recorded"], ["end", "end", "recorded"]]);
    for (const [a, b] of tl.chapters.slice(1).map((c, i) => [tl.chapters[i], c])) assert.ok(b.start >= a.end - 0.01, "in order");
    assert.equal(app.state.resets - resetsBefore, 1, "one reset, before the alternate (J-undo has one chapter)");
  });

  test("findings show at the checkpoint that cites them, with their boxes, kind and plain caption", () => {
    const tl = timeline(p);
    assert.deepEqual(tl.annotations.map((a) => [a.finding, a.checkpoint, a.chapter, a.kind, a.priority]), [[f.judged.id, "C-review-1", "main", "judgment", "P3"], [f.both.id, "C-review-2", "main", "checked", "P1"]]);
    const both = tl.annotations[1];
    assert.equal(both.boxes.length, 2, "Approve and Reject outlined");
    assert.ok(both.boxes.every((b) => b.width > 20 && b.height > 10 && b.x >= 0 && b.y >= 0));
    assert.deepEqual(both.caption, plain);
    assert.equal(tl.annotations[0].confidence, "low");
    const vtt = readFileSync(join(p.dir, "video/J-review.vtt"), "utf8");
    assert.match(vtt, /\[Judgment · P3 · worth checking with users\] Nothing says which entry/);
    assert.match(vtt, /\[Checked · P1\] Approve and Reject look equally important/);
    assert.match(readFileSync(join(p.dir, "video/J-review.chapters.vtt"), "utf8"), /Alternate 1/);
  });

  // @covers US-093-AC1
  test("US-093 AC1: signed in from the storage state before recording; the sign-in screen is never shown", () => {
    const mine = hits.slice(hitsBefore);
    assert.ok(mine.some((h) => h.path === "/queue"));
    assert.ok(mine.filter((h) => ["/queue", "/entry/1"].includes(h.path)).every((h) => h.session), "every app page with the session");
    assert.ok(!mine.some((h) => h.path === "/login"), "the sign-in page was never requested");
  });

  // @covers US-093-AC6
  test("US-093 AC6: it wrote only in the run package", () => {
    const o = p.cli("check-writes", "--run", p.run);
    assert.equal(o.status, 0, o.stdout + o.stderr);
  });
});

describe("US-091: viewports", () => {
  // @covers US-091-AC7
  test("AC7: 1440 × 900 by default; one video per listed viewport", async () => {
    const p = pkg({ video: { viewports: [{ width: 1440, height: 900 }, { width: 390, height: 844 }] } });
    walked(p, { undoSteps: [] });
    await run(p, { journeys: ["J-review"] });
    const v = p.read("video/video.json");
    assert.deepEqual(v.videos.map((x) => [x.files.clean, x.viewport]), [["J-review.clean.webm", { width: 1440, height: 900 }], ["J-review@390x844.clean.webm", { width: 390, height: 844 }]]);
    assert.ok(existsSync(join(p.dir, "video/J-review@390x844.annotations.json")));
  });
});

describe("US-093: record signed in, with sensitive data masked", () => {
  // @covers US-093-AC2
  test("AC2: a guest role (auth: none) starts signed out", async () => {
    const p = pkg({ role: { id: "reviewer", auth: "none" } });
    walked(p, { undoSteps: [] });
    const from = hits.length;
    await run(p, { journeys: ["J-review"] });
    assert.ok(hits.slice(from).some((h) => h.path === "/queue" && !h.session), "the queue was asked for without a session");
    assert.match(p.read("video/J-review.annotations.json").chapters[0].title, /role reviewer \(guest\)/);
  });

  // @covers US-093-AC3
  test("AC3: redacted selectors, text patterns and password fields are masked, including content added after load", async () => {
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ viewport: { width: 900, height: 600 }, extraHTTPHeaders: { cookie: "session=reviewer" } });
      await ctx.addInitScript(layer, { selectors: [".customer-email"], text: ["\\d{4}-\\d{4}"] });
      const pg = await ctx.newPage();
      const masked = async (locator) => {
        const b = await locator.boundingBox();
        const shot = await pg.screenshot({ clip: { x: b.x + 1, y: b.y + 1, width: Math.max(1, b.width - 2), height: Math.max(1, b.height - 2) } });
        const img = await pg.evaluate(async (b64) => { const i = new Image(); i.src = `data:image/png;base64,${b64}`; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext("2d"); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, i.width, i.height).data; const s = new Set(); for (let k = 0; k < d.length; k += 4) s.add(`${d[k]},${d[k + 1]},${d[k + 2]}`); return [...s]; }, shot.toString("base64"));
        return img.length === 1 && img[0] === "31,35,40";
      };
      await pg.goto(`${base}/queue`);
      await pg.waitForSelector("text=late@example.test", { state: "attached" });
      await pg.waitForTimeout(100);
      assert.equal(await pg.evaluate(() => window.__piqVideo.ok), true);
      assert.ok(await masked(pg.locator(".customer-email").first()), "a redacted selector");
      assert.ok(await masked(pg.locator(".customer-email").nth(1)), "one added after load");
      const range = await pg.evaluate(() => { const t = document.querySelector("#acct b").firstChild; const i = t.nodeValue.indexOf("4417"); const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 9); const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
      assert.ok(await masked({ boundingBox: async () => range }), "text matching a pattern");
      assert.equal(await masked(pg.locator("h1")), false, "nothing else");
      await pg.goto(`${base}/modal`);
      await pg.waitForTimeout(150);
      assert.ok(await masked(pg.locator("dialog .customer-email")), "inside a modal dialog, in the top layer");
      await pg.goto(`${base}/login`);
      await pg.waitForTimeout(100);
      assert.ok(await masked(pg.locator("input[type=password]")), "every password field");
    } finally { await browser.close(); }
  });

  // @covers US-093-AC4
  test("AC4: a page without the mask layer discards the journey's video and says why", async () => {
    const p = pkg();
    walked(p, { undoSteps: [{ n: 1, action: "Open a hostile page", status: "done", do: { goto: "/hostile" } }] });
    const r = await run(p, { journeys: ["J-undo"] });
    const v = p.read("video/video.json");
    assert.deepEqual(v.videos, []);
    assert.match(v.notRecorded[0].reason, /the mask layer is not on .*\/hostile; nothing is recorded without it/);
    assert.ok(!existsSync(join(p.dir, "video/J-undo.clean.webm")));
    assert.equal(r.stage.status, "partial");
  });

  // @covers US-093-AC5
  test("AC5: a role whose credential variable is not set is not recorded, with the reason", async () => {
    process.env.REVIEWER_STATE = signedIn(); // planning needs it set; the video is then run without it
    let p;
    try { p = pkg({ role: { id: "reviewer", auth: { env: "REVIEWER_STATE" } } }); } finally { delete process.env.REVIEWER_STATE; }
    walked(p, { undoSteps: [] });
    const r = await run(p, { journeys: ["J-review"], env: {} });
    assert.deepEqual(p.read("video/video.json").notRecorded, [{ journey: "J-review", viewport: { width: 1440, height: 900 }, reason: "role reviewer's credential variable REVIEWER_STATE is not set" }]);
    assert.ok(!existsSync(join(p.dir, "video/J-review.clean.webm")));
    assert.equal(r.code, 1);
    // With the variable set to a storage state, it is recorded signed in.
    const r2 = await run(p, { journeys: ["J-review"], env: { REVIEWER_STATE: signedIn() } });
    assert.equal(r2.record.videos.length, 1);
  });
});
