/* Walkthrough video records: replayable steps, plain-English findings, the
   annotation timeline and video.json (FEAT-013 REP-01, ANN-01 to ANN-03,
   OUT-01; CONTRACT-006 "Walkthrough videos"; US-092, US-094).

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { prepared } from "./fixtures/run-package.mjs";

const made = [];
const pkg = (o) => { const p = prepared(o); made.push(p); return p; };
after(() => { for (const p of made) p.remove(); });

const walk = (steps) => ({ schema: "walkthrough", version: 1, journeys: [{ id: "J-review", status: "completed", steps }] });
const opened = { n: 1, action: "Open the queue", status: "done", url: "http://127.0.0.1:4173/queue", checkpoint: "C-review-1", observation: { text: "The queue lists three entries.", basis: ["screenshot"], visual: true }, do: { goto: "/queue" } };
const plain = { problem: "After approving, nothing confirms it worked, so reviewers approve twice.", recommendation: "Confirm each approval on screen, with a way to undo it." };
const timeline = (over = {}) => ({
  schema: "annotations", version: 1, journey: "J-review", viewport: { width: 1440, height: 900 },
  chapters: [{ id: "title", kind: "title", start: 0, end: 3, status: "recorded" }, { id: "main", kind: "main", start: 3, end: 30, status: "recorded" }],
  annotations: [],
  ...over,
});
const problems = (p) => { const o = p.cli("validate-report", p.dir); return o.status === 0 ? "" : o.stdout; };

describe("US-092: the agent records replayable steps and plain-English findings", () => {
  // @covers US-092-AC1
  test("AC1: with a video, a done step without a replay step is reported as not replayable", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    const { do: _, ...bare } = opened;
    p.write("walkthrough.json", walk([bare, { n: 2, action: "Approve the first entry", status: "done", do: { click: "role=button[name='Approve']", action: "edit-test-data" } }]));
    assert.equal(p.cli("validate-report", p.dir).status, 0, "without a video, the step is still a valid record");
    p.write("video/J-review.annotations.json", timeline());
    assert.match(problems(p), /step 1 of J-review is not replayable: record the browser action it took as "do"/);
    p.write("walkthrough.json", walk([opened, { n: 2, action: "Approve the first entry", status: "done", do: { click: "role=button[name='Approve']", action: "edit-test-data" } }]));
    assert.equal(p.cli("validate-report", p.dir).status, 0, problems(p));
    // Only the replay format is a replay step.
    p.write("walkthrough.json", walk([{ ...opened, do: { tap: "#x" } }]));
    assert.equal(p.cli("validate-report", p.dir).status, 1);
  });

  // @covers US-092-AC2
  test("AC2: a secret typed into a field is recorded by reference, never as a literal", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    const typed = (value) => walk([opened, { n: 2, action: "Paste the API key", status: "done", do: { fill: "#api-key", value } }]);
    p.write("walkthrough.json", typed({ secret: "REVIEW_API_KEY" }));
    assert.equal(p.cli("validate-report", p.dir).status, 0, problems(p));
    p.write("walkthrough.json", typed("sk-abcdefghijklmnopqrstuvwx"));
    assert.match(problems(p), /step 2 records an API key \(sk-…\) as a literal; record \{ secret: NAME \} instead/);
    p.write("walkthrough.json", typed({ secret: "lower-case" }));
    assert.equal(p.cli("validate-report", p.dir).status, 1, "a reference names an environment variable");
  });

  // @covers US-092-AC3
  test("AC3: a finding shown in a video has plain English, short and free of rule IDs, tokens and component names", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    const shown = (f) => {
      p.write("backlog.json", { schema: "backlog", version: 1, findings: [f], user_validation: [] });
      p.write("video/J-review.annotations.json", timeline({ annotations: [{ finding: f.id, checkpoint: "C-review-1", chapter: "main", start: 10, end: 16, kind: "checked", priority: "P2", confidence: "high", boxes: [], caption: plain }] }));
      return problems(p);
    };
    assert.match(shown(p.finding()), /is shown in a video but has no "plain"/);
    assert.equal(shown(p.finding({ plain })), "");
    assert.match(shown(p.finding({ plain: { ...plain, recommendation: "Add a ToastProvider and a toast. Follow modal.dismiss. Use --piq-color-accent." } })),
      /plain recommendation is 3 sentences[\s\S]*plain recommendation names a token, the rule ID modal\.dismiss, the component name ToastProvider/);
    assert.equal(shown(p.finding({ plain: { ...plain, recommendation: "Make Approve the one main button, and confirm before Reject." } })), "", "ordinary words such as button are fine");
  });
});

describe("US-094: go from a video to the report and back", () => {
  // @covers US-094-AC2
  test("AC2: video.json lists each video's chapters and each finding's time ranges, and validates against its schema", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    const f = p.finding({ plain });
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [f], user_validation: [] });
    p.write("walkthrough.json", walk([opened]));
    const t = timeline({ annotations: [{ finding: f.id, checkpoint: "C-review-1", chapter: "main", start: 10, end: 16, kind: "checked", priority: "P2", boxes: [{ x: 10, y: 20, width: 100, height: 40 }], caption: plain }] });
    p.write("video/J-review.annotations.json", t);
    p.write("video/J-review.clean.webm", "webm");
    const video = { schema: "video", version: 1, videos: [{ journey: "J-review", viewport: { width: 1440, height: 900 }, files: { clean: "J-review.clean.webm", annotations: "J-review.annotations.json" }, chapters: t.chapters, findings: [{ id: f.id, ranges: [{ start: 10, end: 16 }] }] }], notRecorded: [{ journey: "J-undo", reason: "no done steps" }] };
    p.write("video/video.json", video);
    assert.equal(p.cli("validate-report", p.dir).status, 0, problems(p));
    // Files it names are in video/; its shape is the schema's.
    p.write("video/video.json", { ...video, videos: [{ ...video.videos[0], files: { ...video.videos[0].files, mp4: "J-review.mp4" } }] });
    assert.match(problems(p), /J-review\.mp4 is not in video\//);
    p.write("video/video.json", { ...video, videos: [{ ...video.videos[0], findings: [{ id: f.id }] }] });
    assert.match(problems(p), /video\/video\.json.*needs "ranges"/);
  });

  test("an annotation shows only a backlog finding, where it was found, and nothing after its chapter stopped", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    const f = p.finding({ plain });
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [f], user_validation: [] });
    const at = (n, chapters) => { p.write("video/J-review.annotations.json", timeline({ ...(chapters ? { chapters } : {}), annotations: [{ finding: f.id, checkpoint: "C-review-1", chapter: "main", start: 10, end: 16, kind: "checked", priority: "P2", boxes: [], caption: plain, ...n }] })); return problems(p); };
    assert.match(at({ finding: "F-000000000000" }), /F-000000000000 is not a finding in the backlog/);
    assert.match(at({ checkpoint: "C-review-9" }), /cites no evidence at C-review-9/);
    assert.match(at({}, [{ id: "main", kind: "main", start: 3, end: 12, status: "stopped", reason: "step 3's state differed" }]), /is shown after main stopped \(step 3's state differed\)/);
    assert.equal(at({}), "");
  });
});
