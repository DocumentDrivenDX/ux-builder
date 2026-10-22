/* Walkthrough videos end to end, through the CLI at the real pace: a
   journey from the blueprint (FEAT-012) with a walked alternate, a signed-in
   role and redacted data; assess video, then assess report and
   validate-report (FEAT-013 step 7; its success metric "every seeded finding
   appears at its checkpoint's step, and none elsewhere"; PRV-01).

   Needs ffmpeg on the PATH (CI installs it).

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { after, before, describe, test } from "node:test";
import { chromium } from "playwright";
import { findFfmpeg } from "../assess/video-render.mjs";
import { plain, videoApp } from "./fixtures/video-app.mjs";

const FFMPEG = findFfmpeg();
const BLUEPRINT = {
  version: 1, kind: "app", name: "Review app", supports: ["expanded"],
  destinations: [{ id: "work", label: "Work", screen: "queue" }],
  screens: [
    { id: "queue", title: "Entries", pattern: "WorkQueue", actions: [{ id: "open", label: "Open entry", to: "entry" }] },
    { id: "entry", title: "Entry", pattern: "WorkQueue", actions: [{ id: "approve", label: "Approve", to: "queue", primary: true }, { id: "reject", label: "Reject", to: "queue", destructive: "confirm" }] },
  ],
  journeys: [{
    id: "J-review", story: "US-001", criteria: ["US-001-AC2"], entry: "queue",
    steps: [{ screen: "queue", action: "open" }, { screen: "entry", action: "approve" }, { screen: "queue" }],
    alternates: [{ from: 1, steps: [{ screen: "entry", action: "reject" }, { screen: "queue" }], reason: "the reviewer rejects" }],
  }],
};

let app, p, f, out;
before(async () => {
  app = await videoApp();
  p = app.pkg({ files: { "app.blueprint.json": JSON.stringify(BLUEPRINT) }, manifest: { journeys: [{ blueprint: "J-review", role: "reviewer", priority: "critical", fixture: "queue" }] } });
  p.checkpointAt("C-review-1"); p.checkpointAt("C-review-2"); p.checkpointAt("C-review-3");
  const obs = { text: "seen", basis: ["screenshot"], visual: true };
  p.write("walkthrough.json", { schema: "walkthrough", version: 1, journeys: [{ id: "J-review", status: "completed", steps: [
    { n: 1, action: "Open the queue", status: "done", url: "/queue", checkpoint: "C-review-1", observation: obs, do: { goto: "/queue" } },
    { n: 2, action: "Open entry 1", status: "done", url: "/entry/1", checkpoint: "C-review-2", observation: obs, do: { click: "role=link[name='Entry 1']" } },
    { n: 3, action: "Reject it", status: "done", alternate: 1, do: { goto: "/entry/1" } },
    { n: 4, action: "Open the reason", status: "done", alternate: 1, url: "/entry/1", checkpoint: "C-review-3", observation: obs, do: { click: "#reject" } },
    { n: 5, action: "Give a reason", status: "done", alternate: 1, do: { fill: "#reason", value: "Duplicate" } },
    { n: 6, action: "Confirm", status: "done", alternate: 1, do: { click: "#confirm", action: "edit-test-data" } },
  ] }] });
  f = {
    both: p.finding({ title: "Approve and Reject look the same", key: "same", priority: "P1", plain, elements: ["#approve", "#reject"], evidence_refs: ["checkpoints/C-review-2/screenshot.png"] }),
    first: p.finding({ title: "The queue does not say what to do first", key: "first", finding_type: "heuristic", source_refs: [], priority: "P3", expected_behavior_or_proposed_requirement: "Proposed criterion: Given a queue, when it opens, then the next entry to review is marked.", plain: { problem: "Nothing says which entry to review first.", recommendation: "Mark the next entry to review." }, evidence_refs: ["checkpoints/C-review-1/screenshot.png"] }),
    reason: p.finding({ title: "The reason field has no hint", key: "reason", priority: "P2", plain: { problem: "The reject dialog does not say what a good reason looks like.", recommendation: "Add a short example under the reason field." }, elements: ["#reason"], evidence_refs: ["checkpoints/C-review-3/screenshot.png"] }),
  };
  p.write("backlog.json", { schema: "backlog", version: 1, findings: Object.values(f), user_validation: [] });
  // Not spawnSync: the app is served from this process, which must keep answering.
  out = await new Promise((done) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL("../cli.mjs", import.meta.url)), "assess", "video", "--run", p.run], { cwd: p.r.dir });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("exit", (status) => done({ status, stdout, stderr }));
  });
});
after(() => app?.close());

const timeline = () => p.read("video/J-review.annotations.json");

describe("FEAT-013 end to end: a blueprint journey, recorded, annotated and reported", () => {
  test("assess video records the blueprint journey and its alternate, signed in, and writes every output", { skip: FFMPEG ? false : "ffmpeg is not on the PATH" }, () => {
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /J-review 1440×900: 2 chapter\(s\), 3 finding\(s\) shown → video\/J-review\.clean\.webm/);
    for (const file of ["J-review.mp4", "J-review.clean.webm", "J-review.annotations.json", "J-review.vtt", "J-review.chapters.vtt", "video.json", "index.html"]) assert.ok(existsSync(join(p.dir, "video", file)), file);
    const tl = timeline();
    assert.deepEqual(tl.chapters.map((c) => [c.kind, c.title.split(" · ")[0]]), [["title", "Review app"], ["main", "Main path"], ["alternate", "Alternate 1: the reviewer rejects"], ["end", "End"]]);
    assert.match(tl.chapters[0].title, /Review a queue · J-review · US-001 · role reviewer/);
  });

  test("every seeded finding appears at its checkpoint's step, in its chapter, and nowhere else", { skip: FFMPEG ? false : "ffmpeg is not on the PATH" }, () => {
    const tl = timeline();
    assert.deepEqual(tl.annotations.map((a) => [a.finding, a.checkpoint, a.chapter]), [[f.first.id, "C-review-1", "main"], [f.both.id, "C-review-2", "main"], [f.reason.id, "C-review-3", "alternate-1"]]);
    const chapter = new Map(tl.chapters.map((c) => [c.id, c]));
    for (const a of tl.annotations) assert.ok(a.start >= chapter.get(a.chapter).start && a.end <= chapter.get(a.chapter).end, `${a.finding} within its chapter`);
    assert.equal(tl.annotations.find((a) => a.finding === f.reason.id).boxes.length, 1, "the reason field, inside the modal dialog, outlined");
  });

  test("no frame of the MP4 shows a redacted value", { skip: FFMPEG ? false : "ffmpeg is not on the PATH" }, () => {
    // Four frames a second, as 160 × 100 thumbnails would hide small text: full size, red pixels counted.
    const o = spawnSync(FFMPEG, ["-v", "error", "-i", join(p.dir, "video/J-review.mp4"), "-vf", "fps=4", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1024 * 1024 * 1024 });
    assert.equal(o.status, 0, String(o.stderr));
    const frame = 1440 * 900 * 3;
    const frames = o.stdout.length / frame;
    assert.ok(frames > 40, `${frames} frames sampled`);
    let worst = 0;
    for (let k = 0; k < frames; k++) {
      let red = 0;
      for (let i = k * frame; i < (k + 1) * frame; i += 3) if (o.stdout[i] > 190 && o.stdout[i + 1] < 70 && o.stdout[i + 2] < 70) red++;
      worst = Math.max(worst, red);
    }
    assert.ok(worst < 20, `at most ${worst} pure-red pixels in any frame (compression noise), so no redacted value is visible`);
  });

  test("the player shows each finding, and the report links to it; the package validates", { skip: FFMPEG ? false : "ffmpeg is not on the PATH" }, async () => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      await page.goto(pathToFileURL(join(p.dir, "video/index.html")).href);
      await page.waitForFunction(() => window.__player?.video.readyState >= 1);
      for (const a of timeline().annotations) {
        await page.evaluate((k) => window.__player.seekTo(window.__player.current.annotations.find((x) => x.finding === k)), a.finding);
        await page.waitForFunction((k) => window.__player.shown?.finding === k, a.finding);
        assert.match(await page.locator("#popup .cap__problem").innerText(), new RegExp(a.caption.problem.slice(0, 20)));
      }
      assert.equal(await page.getAttribute("#mp4", "href"), "J-review.mp4");
    } finally { await browser.close(); }
    assert.equal(p.cli("report", p.dir).status, 0);
    const html = readFileSync(join(p.dir, "report.html"), "utf8");
    for (const a of timeline().annotations) assert.ok(html.includes(`href="video/index.html#J-review@${a.start}"`), a.finding);
    const v = p.cli("validate-report", p.dir);
    assert.equal(v.status, 0, v.stdout);
    assert.equal(p.cli("check-writes", "--run", p.run).status, 0);
  });
});
