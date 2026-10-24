/* The new app's HELIX documents, drafted from the installed HELIX's
   templates (FEAT-010 HLA-01 to HLA-03; US-069; STP-069).

     npm test --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, mock, test } from "node:test";
import { create } from "../index.mjs";
import { bundle, packHelix, releaseServer } from "./fixtures/helix-release.mjs";

const tmp = mkdtempSync(join(tmpdir(), "helix-docs-"));
const BUNDLE = bundle("8.8.0");
process.env.UX_BUILDER_HELIX_BUNDLE = BUNDLE;
after(() => { rmSync(tmp, { recursive: true, force: true }); rmSync(BUNDLE, { recursive: true, force: true }); });
let n = 0;
const make = async (helix = { offline: true }, log) => { const r = await create(join(tmp, `app-${++n}`), { theme: "databricks", name: "acme", modalities: ["responsive-web"], helix, log }); return { r, read: (p) => readFileSync(join(r.dir, "docs/helix", p), "utf8") }; };
const fm = (text) => /^---\n([\s\S]*?)\n---/.exec(text)[1];
const SET = {
  "00-discover/product-vision.md": ["product-vision", "product-vision"],
  "01-frame/prd.md": ["prd", "prd"],
  "01-frame/concerns.md": ["concerns", "concerns"],
  "01-frame/features/FEAT-001-app-shell.md": ["FEAT-001", "feature-specification"],
  "01-frame/user-stories/US-001-open-the-app-and-see-where-to-start.md": ["US-001", "user-stories"],
  "02-design/DESIGN.md": ["design-system", "design-system"],
  "03-test/test-plan.md": ["TP-001", "test-plan"],
  "03-test/test-plans/STP-001-open-the-app-and-see-where-to-start.md": ["STP-001", "story-test-plan"],
};

describe("US-069: start with the HELIX documents drafted", () => {
  // @covers US-069-AC1
  test("AC1: the starter set, each at its catalogue type's location and naming, with id, type, status and links", async () => {
    const { r, read } = await make();
    for (const [p, [id, type]] of Object.entries(SET)) {
      const f = fm(read(p));
      assert.match(f, new RegExp(`^  id: ${id}$`, "m"), p);
      assert.match(f, new RegExp(`^  type: ${type}$`, "m"), p);
      assert.match(f, /^ {2}status: draft$/m, p);
      assert.match(f, /^ {2}authoring:$/m, `${p} keeps the template's own frontmatter`);
    }
    assert.match(fm(read("01-frame/user-stories/US-001-open-the-app-and-see-where-to-start.md")), /links:\n {4}- kind: informed_by\n {6}to: FEAT-001/);
    assert.match(read("01-frame/concerns.local.yml"), /frontend-framework: react-vite/);
    assert.ok(existsSync(join(r.dir, ".helix.yml")));
  });

  // @covers US-069-AC2
  test("AC2: what the starter knows is filled in", async () => {
    const { read } = await make();
    assert.match(read("01-frame/prd.md"), /acme, a React 19 \+ Vite app[\s\S]*theme `databricks`/);
    const concerns = read("01-frame/concerns.md");
    for (const c of ["react-vite", "e2e-playwright", "packaged-design-system", "a11y-wcag-aa", "ux-interaction-patterns"]) assert.match(concerns, new RegExp(`^\\| ${c} \\| library`, "m"), c);
    assert.match(concerns, /language-runtime slot[\s\S]*assumption: HELIX has no Node concern/);
    const story = read("01-frame/user-stories/US-001-open-the-app-and-see-where-to-start.md");
    for (const ac of ["US-001-AC1", "US-001-AC2"]) assert.match(story, new RegExp(`\\*\\*${ac}\\*\\* — Given`), ac);
    assert.match(story, /^\*\*Feature\*\*: FEAT-001/m);
    assert.match(read("02-design/DESIGN.md"), /^# DESIGN\.md — acme$/m);
    assert.match(read("02-design/DESIGN.md"), /`docs\/ux-builder\/blueprint\/app\.blueprint\.json`[\s\S]*AppShell/);
    assert.match(read("03-test/test-plan.md"), /npm run check:blueprint[\s\S]*npm run test:e2e/);
    assert.match(read("03-test/test-plans/STP-001-open-the-app-and-see-where-to-start.md"), /`@covers US-001-AC2`/);
  });

  // @covers US-069-AC3
  test("AC3: the owner's decisions stay the template's placeholders", async () => {
    const { read } = await make();
    const vision = read("00-discover/product-vision.md");
    for (const h of ["## Mission Statement", "## Target Market", "## Success Definition"]) assert.ok(vision.includes(h), h);
    assert.match(vision.split("## Mission Statement")[1].split("\n## ")[0], /\[/, "the mission is still a placeholder");
    const prd = read("01-frame/prd.md");
    assert.match(prd, /### Primary Persona: \[Name\]/);
    assert.match(prd.split("### Goals")[1].split("\n### ")[0], /\[/, "goals are the owner's");
    assert.match(read("01-frame/user-stories/US-001-open-the-app-and-see-where-to-start.md"), /^\*\*Priority\*\*: \[P0 \| P1 \| P2\]$/m);
  });

  // @covers US-069-AC4
  test("AC4: a template with a changed heading is merged by heading, and creation succeeds", async () => {
    const prd = "---\nddx:\n  id: prd\n---\n\n# Product Requirements Document\n\n## Problem\n\n[the problem]\n\n## Technical Notes\n\n[renamed from Technical Context]\n";
    const s = await releaseServer({ "v9.9.0": { gz: packHelix({ version: "9.9.0", files: { "helix/skills/helix/references/activities/01-frame/artifacts/prd/template.md": prd } }) } });
    process.env.UX_BUILDER_HELIX_API = s.api;
    try {
      const { read } = await make({});
      const text = read("01-frame/prd.md");
      assert.match(text, /## Problem\n\n\[the problem\]/, "unfilled sections keep the template's text");
      assert.match(text, /## Technical Notes\n\n\[renamed from Technical Context\]/);
      assert.match(text, /## Technical Context\n\n- \*\*App\*\*: acme/, "a heading the template lost is added at the end");
    } finally { delete process.env.UX_BUILDER_HELIX_API; await s.close(); }
  });

  // @covers US-069-AC4
  test("AC4: a type whose template is missing is drafted from the starter's sections, the type is named, and creation succeeds", async () => {
    const s = await releaseServer({ "v9.9.0": { gz: packHelix({ version: "9.9.0", files: { "helix/skills/helix/references/activities/01-frame/artifacts/prd/template.md": null } }) } });
    process.env.UX_BUILDER_HELIX_API = s.api;
    try {
      const said = [];
      const { r, read } = await make({}, (m) => said.push(m));
      assert.equal(r.helix.tag, "v9.9.0");
      assert.deepEqual(said.filter((m) => /no template/.test(m)), ["HELIX 9.9.0 has no template (activities/01-frame/artifacts/prd/template.md) for the prd type; docs/helix/01-frame/prd.md was drafted from the starter's own sections"]);
      const text = read("01-frame/prd.md");
      assert.match(fm(text), /^ {2}id: prd\n {2}type: prd\n {2}status: draft$/m);
      assert.match(text, /## Technical Context\n\n- \*\*App\*\*: acme/);
      assert.equal(r.helix.documents.length, 9, "every document is still written");
    } finally { delete process.env.UX_BUILDER_HELIX_API; await s.close(); }
  });

  // @covers US-069-AC5
  test("AC5: the same HELIX and options give the same documents, apart from the date", async () => {
    const a = await make();
    mock.timers.enable({ apis: ["Date"], now: Date.parse("2031-02-03T12:00:00Z") });
    let b;
    try { b = await make(); } finally { mock.timers.reset(); }
    const files = (r) => readdirSync(join(r.dir, "docs/helix"), { recursive: true }).filter((f) => /\.(md|yml)$/.test(f)).sort();
    assert.deepEqual(files(b.r), files(a.r));
    assert.equal(files(a.r).length, 9);
    assert.match(b.read("01-frame/prd.md"), /on 2031-02-03 from HELIX/, "the second app was drafted on another day");
    const mask = (t) => t.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "YYYY-MM-DD");
    for (const f of files(a.r)) assert.equal(mask(b.read(f)), mask(a.read(f)), f);
  });
});
