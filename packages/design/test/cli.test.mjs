/* Every command's --json against its exported function and its output
   schema (US-116-AC1; ADR-036 rule 2; CONTRACT-008 Commands). Each command
   runs on two identical fixture apps, one through the CLI and one through
   the function, so writes compare like for like.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import * as design from "../index.mjs";
import { approveAll, cli, tempApp } from "./helpers.mjs";

const OUTPUT = JSON.parse(readFileSync(new URL("../schema/output.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(OUTPUT);
const valid = (name, data) => { const v = ajv.getSchema(`${OUTPUT.$id}#/$defs/${name}`); assert.ok(v(data), `${name}: ${JSON.stringify(v.errors)}`); };

const BP = { version: 1, kind: "app", name: "rivers", supports: { sizeClasses: ["compact"], inputs: ["coarse"] }, destinations: [{ id: "find", label: "Find", screen: "map" }], screens: [{ id: "map", title: "Map", pattern: "CollectionList" }] };

/* A fixture app with a state, a blueprint and a document. */
function fixture() {
  const app = tempApp({ state: { assumptions: [{ id: "A-1", text: "Location is available", status: "assumed", evidence: [], section: "constraints" }] } });
  writeFileSync(join(app, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify(BP));
  // HELIX, and a study's research plan (ADR-042).
  writeFileSync(join(app, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
  mkdirSync(join(app, "docs/helix/01-frame/research"), { recursive: true });
  writeFileSync(join(app, "docs/helix/01-frame/research/anglers.md"), "---\nddx:\n  id: research-anglers\n  type: research-plan\n---\n\n# Research plan: anglers\n\n## Research Methods\n\n### Sources\n\n| Source | Kind | Date | Where it is kept |\n|---|---|---|---|\n| interview 1 | interview | 2026-10-12 | shared drive |\n");
  return app;
}
/* The fixture with its items approved, for commands a pending review would stop (US-148). */
const reviewed = (app) => { approveAll(app); return app; };
/* The fixture with HELIX, for commands that propose into it (ADR-042). */
const helixed = (app) => { writeFileSync(join(app, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n"); mkdirSync(join(app, "docs/helix/02-design/adr"), { recursive: true }); return app; };
/* Paths and times differ between the two apps; everything else must match. */
const same = (a, b) => { const n = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === "app" || k === "at" ? undefined : v))); assert.deepEqual(n(a), n(b)); };

/* [schema name, CLI args, the function call]. */
const COMMANDS = [
  ["status", ["status"], (app) => design.status(app)],
  ["stateGet", ["state", "get", "assumptions"], (app) => design.stateGet(app, { path: "assumptions" })],
  ["stateSet", ["state", "set", "assumptions[+]", '{"text":"Anglers plan the night before"}'], (app) => design.stateSet(app, { path: "assumptions[+]", value: { text: "Anglers plan the night before" } })],
  ["checkpoint", ["state", "checkpoint", "core-1", "--answer", "Yes"], (app) => design.checkpoint(app, { id: "core-1", answer: "Yes" }), reviewed],
  ["overview", ["overview"], () => design.overview()],
  ["explain", ["explain", "blueprint"], () => design.explain({ term: "blueprint" })],
  ["step", ["step", "3"], (app) => design.setStep(app, { to: "3" })],
  ["reviewList", ["review"], (app) => design.reviewList(app)],
  ["reviewShow", ["review", "show", "evidence:anglers"], (app) => design.reviewShow(app, { item: "evidence:anglers" })],
  ["reviewFeedback", ["review", "feedback", "evidence:anglers", "--text", "Cite the second quote too"], (app) => design.reviewFeedback(app, { item: "evidence:anglers", text: "Cite the second quote too" })],
  ["reviewApprove", ["review", "approve", "evidence:anglers", "--answer", "Yes"], (app) => design.reviewApprove(app, { item: "evidence:anglers", answer: "Yes" })],
  ["reviewRespond", ["review", "respond", "FB-1", "--text", "Cited the second quote"], (app) => design.reviewRespond(app, { id: "FB-1", text: "Cited the second quote" }), (app) => { design.reviewFeedback(app, { item: "evidence:anglers", text: "Cite the second quote too" }); return app; }],
  ["modality", ["modality", "--answer", "A web app for phones", "--modality", "responsive-web", "--size-classes", "compact", "--frame", "top-bar"], (app) => design.confirmModality(app, { answer: "A web app for phones", modalities: "responsive-web", sizeClasses: "compact", frame: "top-bar" })],
  ["migrate", ["migrate", "--dry-run"], (app) => design.migrate(app, { dryRun: true })],
  ["mode", ["mode", "change", "--why", "A small change"], (app) => design.setMode(app, { mode: "change", why: "A small change" })],
  ["brief", ["brief", "--name", "Rivers"], (app) => design.brief(app, { name: "Rivers" })],
  ["validate", ["validate"], (app) => design.validate(app)],
  ["evidenceAdd", ["evidence", "add", "package.json", "--kind", "survey", "--study", "anglers", "--date", "2026-10-23", "--source", "Survey tool export"], (app) => design.evidenceAdd(app, { file: "package.json", kind: "survey", study: "anglers", date: "2026-10-23", source: "Survey tool export" })],
  ["evidenceList", ["evidence", "list"], (app) => design.evidenceList(app)],
  ["rubric", ["rubric"], (app) => design.rubric(app)],
  ["decisionAdd", ["decision", "add", "--question", "First?", "--option", "Map", "--option", "Search", "--choice", "Map", "--why", "Fewer steps"], (app) => design.decisionAdd(app, { question: "First?", options: ["Map", "Search"], choice: "Map", why: "Fewer steps" }), helixed],
];

describe("US-116-AC1: every command's --json is its function's result, and fits its schema", () => {
  // @covers US-116-AC1
  test("each command prints JSON that validates against its output schema and equals what its exported function returns", () => {
    for (const [name, args, fn, prepare = (x) => x] of COMMANDS) {
      const a = prepare(fixture()), b = prepare(fixture());
      const r = cli(a, [...args, "--json"]);
      assert.equal(r.status, 0, `${args.join(" ")}: ${r.stderr}`);
      const printed = JSON.parse(r.stdout);
      valid(name, printed);
      same(printed, fn(b));
    }
  });

  // @covers US-116-AC1
  test("init too, on two apps without the guide", () => {
    const a = tempApp({ state: false }), b = tempApp({ state: false });
    const r = cli(a, ["init", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const printed = JSON.parse(r.stdout);
    valid("init", printed);
    same(printed, design.init(b));
  });

  test("every command in CONTRACT-008 that is built has an output schema", () => {
    for (const [name] of COMMANDS) assert.ok(OUTPUT.$defs[name], name);
  });
});
