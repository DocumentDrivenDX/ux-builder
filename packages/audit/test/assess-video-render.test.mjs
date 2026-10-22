/* Walkthrough videos: the MP4s, the annotations composited over the clean
   recording by the player's own caption (FEAT-013 OUT-01, OUT-03, ANN-01,
   ANN-02; ADR-031 decisions 3 and 4; US-091, US-095).

   Needs ffmpeg on the PATH (CI installs it); without it the MP4 tests skip
   with that reason, and the no-ffmpeg behaviour is still tested.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { captionMarkup } from "../assess/video-player.mjs";
import { findFfmpeg, overlayHtml } from "../assess/video-render.mjs";
import { videoApp } from "./fixtures/video-app.mjs";

const FFMPEG = findFfmpeg();
const skip = FFMPEG ? false : "ffmpeg is not on the PATH";
let app, p, f, r;
before(async () => {
  app = await videoApp();
  p = app.pkg();
  f = app.walked(p, { undoSteps: [] });
  r = await app.run(p, { journeys: ["J-review"], pace: 0.25 });
});
after(() => app?.close());

/* The mean difference, 0–255, between the MP4 and the clean recording over a region at time t. */
function differs(t, { x, y, width, height }) {
  const grab = (file) => {
    const o = spawnSync(FFMPEG, ["-v", "error", "-ss", t.toFixed(3), "-i", file, "-frames:v", "1", "-vf", `scale=1440:900,crop=${width}:${height}:${x}:${y}`, "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 64 * 1024 * 1024 });
    assert.equal(o.status, 0, String(o.stderr));
    return o.stdout;
  };
  const a = grab(join(p.dir, "video/J-review.mp4")), b = grab(join(p.dir, "video/J-review.clean.webm"));
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}
const timeline = () => p.read("video/J-review.annotations.json");
const tagOf = (a) => captionMarkup(a).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("US-091: the MP4 shows each finding where it was found", () => {
  // @covers US-091-AC2
  test("AC2: during a finding the MP4 outlines its elements and shows its priority, ID, problem and recommendation", { skip }, () => {
    const a = timeline().annotations.find((x) => x.finding === f.both.id);
    assert.ok(existsSync(join(p.dir, "video/J-review.mp4")));
    assert.match(tagOf(a), new RegExp(`^Checked P1 ${a.finding} ${a.caption.problem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} Heuristic: Visibility of system status \\(Nielsen Norman Group: 10 Usability Heuristics for User Interface Design\\) Fix: ${a.caption.recommendation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    const mid = (a.start + a.end) / 2;
    const [b] = a.boxes;
    assert.ok(differs(mid, { x: b.x - 4, y: b.y - 4, width: b.width + 8, height: 4 }) > 30, "an outline over the first element");
    assert.ok(differs(mid, { x: b.x, y: b.y + b.height + 20, width: 380, height: 120 }) > 8, "a caption beside it");
  });

  // @covers US-091-AC3
  test("AC3: a heuristic's caption says Judgment, a deterministic one's Checked, and low confidence says so", () => {
    const [judged, checked] = timeline().annotations;
    assert.match(overlayHtml(judged, { width: 1440, height: 900 }, ""), /<span class="cap__kind">Judgment<\/span><span class="cap__priority">P3<\/span><span class="cap__low">worth checking with users<\/span>/);
    assert.match(overlayHtml(checked, { width: 1440, height: 900 }, ""), /<span class="cap__kind">Checked<\/span><span class="cap__priority">P1<\/span><span class="cap__id">/);
    const boxed = { ...judged, boxes: [{ x: 10, y: 10, width: 50, height: 20 }] };
    assert.match(overlayHtml(boxed, { width: 1440, height: 900 }, ""), /class="outline outline--judgment"/, "a judgment's outline is dashed");
    assert.match(overlayHtml({ ...checked }, { width: 1440, height: 900 }, ""), /class="outline outline--checked"/);
  });

  test("the MP4 is H.264, the recording's size, its length, and small", { skip }, () => {
    const o = spawnSync(FFMPEG.replace(/ffmpeg$/, "ffprobe"), ["-v", "error", "-show_entries", "stream=codec_name,width,height:format=duration", "-of", "json", join(p.dir, "video/J-review.mp4")], { encoding: "utf8" });
    if (o.status !== 0) return;
    const info = JSON.parse(o.stdout);
    assert.deepEqual([info.streams[0].codec_name, info.streams[0].width, info.streams[0].height], ["h264", 1440, 900]);
    const minutes = Number(info.format.duration) / 60;
    assert.ok(Math.abs(Number(info.format.duration) - timeline().duration) < 1.5, "as long as the recording");
    assert.ok(statSync(join(p.dir, "video/J-review.mp4")).size / minutes < 20 * 1024 * 1024, "under 20 MB a minute");
    assert.equal(p.read("video/video.json").videos[0].files.mp4, "J-review.mp4");
  });
});

describe("US-095: the MP4 and the player agree", () => {
  // @covers US-095-AC8
  test("AC8: each annotation is in the MP4 from its start to its end, and not around them", { skip }, () => {
    for (const a of timeline().annotations) {
      const region = a.boxes.length ? { x: a.boxes[0].x - 4, y: a.boxes[0].y - 4, width: a.boxes[0].width + 8, height: 4 } : { x: 520, y: 760, width: 400, height: 100 };
      const at = (t) => differs(t, region);
      assert.ok(at(a.start + 0.12) > 8, `${a.finding} shown just after its start`);
      assert.ok(at(a.end - 0.12) > 8, `${a.finding} shown just before its end`);
      assert.ok(at(Math.max(0, a.start - 0.2)) < 4, `${a.finding} not shown before its start`);
      assert.ok(at(a.end + 0.2) < 4, `${a.finding} not shown after its end`);
    }
    // The player draws the same timeline, with the same caption markup (US-095-AC2).
  });

  // @covers US-091-AC6
  // @covers US-095-AC7
  test("without ffmpeg: no MP4, the player still works, and the stage is partial with the reason", async () => {
    const q = app.pkg();
    app.walked(q, { undoSteps: [] });
    const r2 = await app.run(q, { journeys: ["J-review"], ffmpeg: "ffmpeg-that-is-not-installed" });
    assert.ok(!existsSync(join(q.dir, "video/J-review.mp4")));
    assert.ok(existsSync(join(q.dir, "video/J-review.clean.webm")) && existsSync(join(q.dir, "video/index.html")));
    assert.equal(q.read("video/video.json").videos[0].files.mp4, undefined);
    assert.equal(r2.stage.status, "partial");
    assert.match(r2.stage.reason, /ffmpeg is not on the PATH, so no MP4 was written; the player \(video\/index\.html\) still plays every journey/);
    assert.equal(r2.code, 1);
    assert.equal(q.cli("validate-report", q.dir).status, 0, q.cli("validate-report", q.dir).stdout);
  });
});
