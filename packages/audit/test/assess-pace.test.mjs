/* The walkthrough video at a human pace, each rule spelled out (FEAT-015
   RPT-06, RPT-07; US-103; CONTRACT-006 "Journey-first report, HELIX
   artifact and pace"). The timing is a pure function (holds); the
   recordings run with real time scaled down (timeScale) and record the
   holds they showed.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { overlayHtml } from "../assess/video-render.mjs";
import { captionMarkup } from "../assess/video-player.mjs";
import { captionText, captionWords, FLOOR, holds, PACES, screenOf, stepTitle } from "../assess/video.mjs";
import { videoApp } from "./fixtures/video-app.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const PRIMARY = JSON.parse(readFileSync(join(PKG, "../ui/catalogue.json"), "utf8")).interaction.rules.find((r) => r.id === "emphasis.one-primary");
const SCALE = 0.08;
let app, normal, slow;
before(async () => {
  app = await videoApp();
  // The same run at the normal and the slow pace; the P1 finding names a catalogue rule.
  const run = async (pace) => {
    const p = app.pkg();
    const f = app.walked(p);
    const backlog = p.read("backlog.json");
    backlog.findings = backlog.findings.map((x) => (x.id === f.both.id ? { ...x, rule: "emphasis.one-primary", heuristic: undefined } : x));
    p.write("backlog.json", backlog);
    const r = await app.run(p, { journeys: ["J-review"], pace, timeScale: SCALE });
    assert.equal(r.record.videos.length, 1, JSON.stringify(r.stage));
    return { p, f, tl: p.read("video/J-review.annotations.json") };
  };
  normal = await run("normal");
  slow = await run("slow");
});
after(() => app?.close());

const words = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;

describe("US-103: watch the walkthrough at a human pace, each rule spelled out", () => {
  // @covers US-103-AC1
  test("AC1: at the default pace a step holds 2 s and a finding max(5 s, its words ÷ 200 × 60 s)", () => {
    const h = holds();
    assert.equal(h.pace, "normal");
    assert.equal(h.step, 2);
    assert.equal(h.finding(10), 5, "short: the 5 s floor");
    assert.equal(h.finding(40), 12, "40 words at 200 a minute");
    assert.equal(h.finding(100), 30);
    // In a recording: each finding held for its whole caption's words, each step at least 2 s (in scaled time).
    for (const a of normal.tl.annotations) {
      const n = captionWords(a.caption, a.rule);
      assert.equal(n, words(a.caption.problem) + words(a.caption.recommendation) + (a.rule.id ? words(a.rule.id) + words(a.rule.statement) : words(a.rule.heuristic) + words(a.rule.source ?? "")));
      assert.equal(a.hold, +Math.max(5, (n / 200) * 60).toFixed(3), a.finding);
      assert.ok(a.end - a.start >= a.hold * SCALE - 0.02, `${a.finding} shown for its hold`);
    }
    assert.equal(normal.tl.pace, "normal");
    const quiet = normal.tl.steps.filter((s) => !normal.tl.annotations.some((a) => a.chapter === s.chapter && a.start >= s.start && a.end <= s.end));
    assert.ok(quiet.length >= 2, "steps without findings");
    for (const s of quiet) assert.ok(s.end - s.start >= 2 * SCALE - 0.02, `step ${s.n} holds 2 s`);
  });

  // @covers US-103-AC2
  test("AC2: --pace slow and fast scale every hold by 1.5 and 0.6, never below 1 s a step or 3 s a finding", () => {
    assert.deepEqual(PACES, { slow: 1.5, normal: 1, fast: 0.6 });
    assert.deepEqual(FLOOR, { step: 1, finding: 3 });
    assert.equal(holds("slow").step, 3);
    assert.equal(holds("fast").step, 1.2);
    assert.equal(holds("slow").finding(40), 18);
    assert.equal(holds("fast").finding(40), 7.2);
    assert.equal(holds("fast").finding(1), 3, "5 s × 0.6 is under the 3 s floor");
    assert.equal(holds("fast", { min: 1, perWord: 0.3 }).finding(1), 3, "even with a shorter minimum");
    assert.ok(holds("fast", { min: 0, perWord: 0 }).step >= 1);
    assert.throws(() => holds("brisk"), /slow, normal or fast/);
    // The slow recording held each finding 1.5 times as long, and says so.
    assert.equal(slow.tl.pace, "slow");
    for (const a of slow.tl.annotations) {
      const b = normal.tl.annotations.find((x) => x.finding === a.finding);
      assert.equal(a.hold, +(b.hold * 1.5).toFixed(3), a.finding);
    }
    // The command line refuses any other pace.
    const r = spawnSync(process.execPath, [join(PKG, "cli.mjs"), "assess", "video", "--run", "R-x", "--pace", "brisk"], { encoding: "utf8" });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--pace is slow, normal or fast/);
  });

  // @covers US-103-AC3
  test("AC3: a finding's caption, in the MP4 and the player, has the rule ID and full statement, the problem and the fix", () => {
    const a = normal.tl.annotations.find((x) => x.finding === normal.f.both.id);
    assert.deepEqual(a.rule, { id: "emphasis.one-primary", statement: PRIMARY.statement });
    const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
    // The MP4 draws overlayHtml; the player's pop-up draws captionMarkup, the same markup.
    for (const html of [overlayHtml(a, { width: 1440, height: 900 }, ""), captionMarkup(a)]) {
      const t = text(html);
      assert.ok(t.includes(`emphasis.one-primary ${PRIMARY.statement}`), t);
      assert.ok(t.includes(a.caption.problem) && t.includes(`Fix: ${a.caption.recommendation}`), t);
    }
    assert.ok(readFileSync(join(normal.p.dir, "video/index.html"), "utf8").includes("cap__rule"), "the player carries the same caption markup");
    assert.match(readFileSync(join(normal.p.dir, "video/J-review.vtt"), "utf8"), new RegExp(`Rule emphasis\\.one-primary: ${PRIMARY.statement.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    // A heuristic's caption names it and its source.
    const judged = normal.tl.annotations.find((x) => x.finding === normal.f.judged.id);
    assert.equal(judged.rule.heuristic, "Visibility of system status");
    assert.match(captionText(judged), /Rule Heuristic: Visibility of system status \(Nielsen Norman Group/);
  });

  // @covers US-103-AC4
  test("AC4: each chapter is titled with the journey and the step's screen", () => {
    const vtt = readFileSync(join(normal.p.dir, "video/J-review.chapters.vtt"), "utf8");
    const titles = vtt.split("\n\n").slice(1).map((c) => c.split("\n").slice(2).join(" ").trim()).filter(Boolean);
    assert.equal(titles[0].split(" · ")[0], "J-review", "the title card");
    assert.equal(titles.at(-1), "J-review · end");
    const steps = titles.slice(1, -1);
    assert.deepEqual(steps.slice(0, 2), ["J-review · step 1: /queue", "J-review · step 2: /entry/1"]);
    for (const t of steps) assert.match(t, /^J-review · step \d+: \S/);
    assert.deepEqual(normal.tl.steps.map((s) => s.n), [1, 2, 3, 4, 5, 6]);
    // A blueprint journey's step names its screen.
    const planJ = { steps: [{ n: 1, screen: "queue" }, { n: 2, screen: "entry" }] };
    assert.equal(stepTitle("J-review", { n: 2, url: "/entry/1" }, planJ), "J-review · step 2: entry");
    assert.equal(screenOf({ n: 1, alternate: 1, action: "Reject it" }, planJ), "Reject it", "an alternate's step is not the main path's");
  });
});
