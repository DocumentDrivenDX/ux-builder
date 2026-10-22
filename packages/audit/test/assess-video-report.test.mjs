/* Walkthrough videos in the report and the evidence index, and their
   determinism (FEAT-013 OUT-02, NFR determinism; US-094).

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { videoApp } from "./fixtures/video-app.mjs";

let app, p, f, first;
const sequence = () => p.read("video/J-review.annotations.json").annotations.map((a) => [a.finding, a.checkpoint, a.chapter, a.kind, a.priority, a.boxes.length]);
before(async () => {
  app = await videoApp();
  p = app.pkg();
  f = app.walked(p, { undoSteps: [] });
  await app.run(p, { journeys: ["J-review"], ffmpeg: "no-ffmpeg-here" });
  first = sequence();
  const o = p.cli("report", p.dir);
  assert.equal(o.status, 0, o.stderr);
});
after(() => app?.close());

describe("US-094: go from a video to the report and back", () => {
  // @covers US-094-AC1
  test("AC1: each finding shown in a video links from report.html to its moment in the player, and is an anchor the player links to", () => {
    const html = readFileSync(join(p.dir, "report.html"), "utf8");
    const md = readFileSync(join(p.dir, "report.md"), "utf8");
    for (const a of p.read("video/J-review.annotations.json").annotations) {
      const m = Math.floor(a.start / 60), s = String(Math.floor(a.start % 60)).padStart(2, "0");
      assert.ok(html.includes(`<a href="video/index.html#J-review@${a.start}">J-review at ${m}:${s}</a>`), `a link to ${a.finding} at ${a.start}`);
      assert.match(html, new RegExp(`<h[1-6] id="${a.finding}">`), `${a.finding} is an anchor`);
    }
    assert.match(md, /- Walkthrough videos: 1 recorded; \[watch them in the player\]\(video\/index\.html\)/);
    assert.match(md, new RegExp(`In plain English\\*\\*: ${f.both.plain.problem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });

  // @covers US-094-AC3
  test("AC3: evidence.json lists each recording, timeline, caption track, video.json and the player, referenced by the findings they show", () => {
    const files = new Map(p.read("evidence.json").files.map((x) => [x.path, x]));
    const shown = p.read("video/video.json").videos[0].findings.map((x) => x.id);
    assert.deepEqual([files.get("video/J-review.clean.webm")?.kind, files.get("video/J-review.vtt")?.kind, files.get("video/J-review.annotations.json")?.kind, files.get("video/index.html")?.kind, files.get("video/video.json")?.kind], ["video", "captions", "record", "player", "record"]);
    for (const path of ["video/J-review.clean.webm", "video/J-review.annotations.json", "video/J-review.vtt", "video/J-review.chapters.vtt"]) for (const id of shown) assert.ok(files.get(path).referencedBy.includes(id), `${path} is evidence of ${id}`);
    assert.deepEqual(files.get("video/video.json").referencedBy, ["video"]);
    const v = p.cli("validate-report", p.dir);
    assert.equal(v.status, 0, v.stdout);
  });

  // @covers US-094-AC4
  test("AC4: two video runs over the same run package show the same findings in the same order at the same steps", async () => {
    await app.run(p, { journeys: ["J-review"], ffmpeg: "no-ffmpeg-here" });
    assert.deepEqual(sequence(), first);
    assert.ok(first.length >= 2);
  });
});
