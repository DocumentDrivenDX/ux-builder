/* The experience brief (US-122-AC1 to AC3; FEAT-018 GDL-13 to GDL-16;
   CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { currentText, parseDocument, validate } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

const put = (app, path, text) => { mkdirSync(join(app, path, ".."), { recursive: true }); writeFileSync(join(app, path), text); };

const STATE = {
  questions: [{ id: "Q-1", text: "Search first or map first?", status: "open" }],
  assumptions: [
    { id: "A-1", text: "People choose rivers by place", status: "confirmed", evidence: ["EV-1"], section: "users" },
    { id: "A-2", text: "Location is available on most phones", status: "assumed", evidence: [], section: "constraints" },
    { id: "A-3", text: "Most plan the night before", status: "hypothesis", evidence: [], section: "users", confirm: "Ask in each interview when they plan" },
    { id: "A-4", text: "People want to rate rivers", status: "refuted", evidence: ["EV-2"], section: "jobs" },
  ],
};

function helixApp() {
  const app = tempApp({ state: STATE });
  writeFileSync(join(app, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
  put(app, "docs/helix/01-frame/prd.md", `---\nddx:\n  id: prd\n  type: prd\n---\n\n# Product Requirements Document — River Path\n\n## Summary\n\nRiver Path helps people discover rivers and the places to reach them. It starts on a phone.\n\n## Users and Scope\n\n### Primary Persona: Angler\n\nFishes weekly.\n\n### Secondary Persona: Kayaker\n\nPlans with friends.\n\n## Constraints, Assumptions, Dependencies\n\n### Constraints\n\n- Mobile web application\n- Limited development resources\n`);
  put(app, "docs/helix/01-frame/user-stories/US-001-find-a-river.md", "---\nddx:\n  id: US-001\n  type: user-stories\n---\n\n# US-001: Find a river near me\n");
  // One experience principle applied to principles.md, with its rule; one still proposed.
  put(app, "docs/helix/01-frame/principles.md", "---\nddx:\n  id: principles\n  type: principles\n---\n\n# Principles\n\n## Experience Principles\n\n- No mandatory account creation\n");
  put(app, ".ux-builder/principles.json", JSON.stringify({ principles: [{ key: "no-mandatory-account-creation", text: "No mandatory account creation", rule: { kind: "no-step-before", screens: ["sign-in"] } }] }));
  assert.equal(cli(app, ["principle", "add", "--text", "Progressive disclosure"]).status, 0);
  return app;
}

describe("brief", () => {
  // @covers US-122-AC1
  test("from the PRD, stories and state: seven sections, each point with its status", () => {
    const app = helixApp();
    const r = cli(app, ["brief", "--name", "River Path", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).written, ["docs/ux-builder/brief.md", "docs/ux-builder/brief.html"]);
    const text = readFileSync(join(app, "docs/ux-builder/brief.md"), "utf8");
    const doc = parseDocument(text);
    assert.deepEqual(doc.headings, ["Product", "Target users", "Primary outcome", "Primary jobs", "Experience principles", "Constraints", "Open questions"]);
    assert.match(text, /- River Path: River Path helps people discover rivers and the places to reach them\. \[confirmed\]/);
    assert.match(text, /- Angler \[confirmed\]\n- Kayaker \[confirmed\]\n- People choose rivers by place \[confirmed\]\n- Most plan the night before \[hypothesis\]/);
    assert.match(text, /- US-001: Find a river near me \[confirmed\]/);
    assert.match(text, /- No mandatory account creation \[confirmed\] \(checked: no-step-before\)\n- Progressive disclosure \[assumed\]/);
    assert.match(text, /- Mobile web application \[confirmed\]\n- Limited development resources \[confirmed\]\n- Location is available on most phones \[assumed\]/);
    assert.match(text, /## Open questions\n\n_From the design state's open questions\._\n\n- Search first or map first\?/);
    assert.doesNotMatch(text, /rate rivers/, "a refuted point is left out");
    assert.equal(validate(app).valid, true, JSON.stringify(validate(app).problems));
    // The page the person reads.
    assert.match(readFileSync(join(app, "docs/ux-builder/brief.html"), "utf8"), /<h1>Experience brief: River Path<\/h1>[\s\S]*<span class="status status-hypothesis">hypothesis<\/span>/);
    // A PRD still the template (a fresh HELIX app's) gives no points: its [placeholders] are not confirmed facts.
    put(app, "docs/helix/01-frame/prd.md", "---\nddx:\n  id: prd\n  type: prd\n---\n\n# Product Requirements Document\n\n## Summary\n\n[This section should work as a standalone 1-pager.]\n\n## Users and Scope\n\n### Primary Persona: [Name]\n\n## Constraints, Assumptions, Dependencies\n\n### Constraints\n\n- Technical: [Platform or technology limits]\n- Works offline, see [the spec](https://example.com/spec)\n");
    cli(app, ["brief"]);
    const fresh = readFileSync(join(app, "docs/ux-builder/brief.md"), "utf8");
    assert.doesNotMatch(fresh, /\[(Name|Platform|This section)|Product Requirements Document \[/);
    assert.match(fresh, /- Works offline, see \[the spec\]\(https:\/\/example\.com\/spec\) \[confirmed\]/, "a Markdown link is not a placeholder");
  });

  // @covers US-122-AC2
  test("a hypothesis lists what would confirm it", () => {
    const app = helixApp();
    assert.equal(cli(app, ["brief"]).status, 0);
    assert.match(readFileSync(join(app, "docs/ux-builder/brief.md"), "utf8"), /- Most plan the night before \[hypothesis\]\n  Confirm by: Ask in each interview when they plan/);
    // Without one, the brief says it is still to decide rather than leaving it out.
    const app2 = tempApp({ state: { assumptions: [{ id: "A-1", text: "Anglers start from a map", status: "hypothesis", evidence: [], section: "users" }] } });
    assert.equal(cli(app2, ["brief"]).status, 0);
    assert.match(readFileSync(join(app2, "docs/ux-builder/brief.md"), "utf8"), /Anglers start from a map \[hypothesis\]\n  Confirm by: to be decided with the person/);
  });

  // @covers US-122-AC3
  test("with no HELIX marker, the brief is built from the design state alone and says HELIX was not found", () => {
    const app = tempApp({ state: STATE });
    const r = cli(app, ["brief"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /HELIX was not found \(no \.helix\.yml\): the brief is built from the design state alone\./);
    const text = readFileSync(join(app, "docs/ux-builder/brief.md"), "utf8");
    assert.match(text, /## Product\n\n_From [^\n]*_\n\n- Not yet known\./);
    assert.match(text, /People choose rivers by place \[confirmed\]/);
    assert.doesNotMatch(text, /links:/, "no PRD to link");
    assert.ok(existsSync(join(app, "docs/ux-builder/brief.html")));
  });

  // @covers US-122-AC6
  test("principle add proposes the principle under principles.md's Experience Principles, keeps a rule in principles.json, and the state refuses principles", () => {
    const app = tempApp();
    writeFileSync(join(app, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
    const r = cli(app, ["principle", "add", "--text", "No mandatory account creation", "--rule", '{"kind":"no-step-before","patterns":["SignIn"]}', "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.deepEqual({ path: out.path, checked: out.checked }, { path: "docs/helix/01-frame/principles.md", checked: { key: "no-mandatory-account-creation", file: ".ux-builder/principles.json", kind: "no-step-before" } });
    assert.equal(existsSync(join(app, "docs/helix/01-frame/principles.md")), false, "HELIX is written only by applying the proposal");
    cli(app, ["principle", "add", "--text", "Progressive disclosure"]);
    const text = currentText(app, "docs/helix/01-frame/principles.md").text;
    assert.match(text, /^---\nddx:\n  id: principles\n  type: principles\n/);
    assert.match(text, /## Experience Principles\n\n- No mandatory account creation\n- Progressive disclosure\n/);
    // A new principles.md has HELIX's required sections (its validator blocks without them).
    for (const h of ["Principles", "Tension Resolution"]) assert.match(text, new RegExp(`^## ${h}$`, "m"), h);
    assert.deepEqual(JSON.parse(readFileSync(join(app, ".ux-builder/principles.json"), "utf8")).principles, [{ key: "no-mandatory-account-creation", text: "No mandatory account creation", rule: { kind: "no-step-before", patterns: ["SignIn"] } }]);
    assert.equal(cli(app, ["principle", "add", "--text", "x", "--rule", '{"kind":"nope"}']).status, 2);
    const refused = cli(app, ["state", "set", "principles[+]", '{"text":"Be brief"}']);
    assert.equal(refused.status, 2);
    assert.match(refused.stderr, /experience principles go in HELIX's principles\.md: ux-builder-design principle add/);
    // A principle still in an older design state is noted in the brief.
    const old = tempApp({ state: { principles: [{ id: "PR-1", text: "Be brief", status: "assumed" }] } });
    assert.match(cli(old, ["brief"]).stdout, /One experience principle is still in the design state; propose it to principles\.md with ux-builder-design principle add\./);
  });

  // @covers US-122-AC7
  test("the brief is compiled: each section names its HELIX source, the PRD's needs lead its jobs, a change in HELIX shows once it is regenerated, and validate warns until then", () => {
    const app = helixApp();
    put(app, "docs/helix/01-frame/prd.md", readFileSync(join(app, "docs/helix/01-frame/prd.md"), "utf8") + "\n### User Needs\n\n| Need | Importance | Evidence | Confidence | Status |\n|---|---|---|---|---|\n| Find a river near home | high | none | low | assumed |\n");
    cli(app, ["brief"]);
    let text = readFileSync(join(app, "docs/ux-builder/brief.md"), "utf8");
    assert.match(text, /## Target users\n\n_From the PRD's User Segments\._/);
    assert.match(text, /## Primary jobs\n\n_From the PRD's User Needs and the user stories\._\n\n- Find a river near home \[hypothesis\]\n  Confirm by: a study that supports it[^\n]*\n- US-001: Find a river near me \[confirmed\]/);
    assert.match(text, /## Experience principles\n\n_From principles\.md's Experience Principles\._/);
    assert.equal(validate(app).warnings.filter((w) => w.path === "docs/ux-builder/brief.md").length, 0, "up to date");
    // HELIX changes; the brief says so until it is regenerated.
    put(app, "docs/helix/01-frame/prd.md", readFileSync(join(app, "docs/helix/01-frame/prd.md"), "utf8").replace("Find a river near home", "Find a river near work"));
    assert.match(validate(app).warnings.find((w) => w.path === "docs/ux-builder/brief.md")?.message ?? "", /the brief no longer says what the PRD, principles\.md, the stories and the design state say: regenerate it with ux-builder-design brief/);
    cli(app, ["brief"]);
    text = readFileSync(join(app, "docs/ux-builder/brief.md"), "utf8");
    assert.match(text, /- Find a river near work \[hypothesis\]/);
    assert.equal(validate(app).warnings.filter((w) => w.path === "docs/ux-builder/brief.md").length, 0);
  });
});

