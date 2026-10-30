/* validate (US-123-AC3, AC4, AC5; CONTRACT-008 Documents): problems named
   by file, and nothing the guide writes lands under docs/helix/.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { exampleFile, validate, writeInApp } from "../index.mjs";
import { approveAll, cli, tempApp } from "./helpers.mjs";

const put = (app, path, text) => { mkdirSync(join(app, path, ".."), { recursive: true }); writeFileSync(join(app, path), text); };
const example = (type) => readFileSync(exampleFile(type), "utf8");

/* An app with HELIX (a PRD) and valid documents of several types. */
function appWithDocs() {
  const app = tempApp();
  writeFileSync(join(app, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
  put(app, "docs/helix/01-frame/prd.md", "---\nddx:\n  id: prd\n  type: prd\n---\n\n# PRD\n");
  put(app, "docs/ux-builder/brief.md", example("experience-brief"));
  put(app, "docs/ux-builder/baseline.md", example("baseline"));
  // A study (ADR-042).
  put(app, "docs/helix/01-frame/research/anglers.md", "---\nddx:\n  id: research-anglers\n  type: research-plan\n---\n\n# Research plan: anglers\n");
  return app;
}

/* Every file under a folder, with its contents. */
function snapshot(dir) {
  const out = {};
  const walk = (d, rel) => { for (const n of readdirSync(d).sort()) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p, `${rel}${n}/`); else out[`${rel}${n}`] = readFileSync(p, "utf8"); } };
  walk(dir, "");
  return out;
}

describe("validate", () => {
  test("an app's valid documents pass", () => {
    const app = appWithDocs();
    const r = cli(app, ["validate", "--json"]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(JSON.parse(r.stdout).documents.length, 2);
  });

  // @covers US-123-AC3
  test("a missing frontmatter field, a wrong ID format or a link to a HELIX ID that does not exist: exit 1 naming the file and the problem", () => {
    const app = appWithDocs();
    put(app, "docs/ux-builder/baseline.md", example("baseline").replace("  id: baseline\n", ""));
    put(app, "docs/ux-builder/brief.md", example("experience-brief").replace("id: brief", "id: brief-3").replace("to: prd", "to: FEAT-404"));
    const r = cli(app, ["validate"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /^docs\/ux-builder\/brief\.md: link to FEAT-404 \(informed_by\) does not resolve to a docs\/ux document or a HELIX document$/m);
    assert.match(r.stdout, /^docs\/ux-builder\/baseline\.md: the frontmatter is missing ux\.id$/m);
    assert.match(r.stdout, /^docs\/ux-builder\/brief\.md: ID "brief-3" does not match brief's format \(brief\)$/m);
  });

  test("type rules: a section missing, a misplaced document", () => {
    const app = appWithDocs();
    put(app, "docs/ux-builder/brief.md", example("experience-brief").replace("## Constraints", "## Limits"));
    put(app, "docs/ux-builder/old/baseline.md", example("baseline"));
    const { problems } = validate(app);
    const msgs = problems.map((p) => `${p.path}: ${p.message}`);
    assert.ok(msgs.includes('docs/ux-builder/brief.md: missing the section "## Constraints"'), msgs.join("\n"));
    assert.ok(msgs.includes("docs/ux-builder/old/baseline.md: a baseline with ID baseline belongs at docs/ux-builder/baseline.md, not docs/ux-builder/old/baseline.md"), msgs.join("\n"));
  });

  // @covers US-123-AC4
  test("the guide's commands that write never write under docs/helix/", () => {
    const app = appWithDocs();
    const before = snapshot(join(app, "docs/helix"));
    const runs = [
      ["state", "set", "next", '"Compare flows"'],
      ["state", "set", "assumptions[+]", '{"text":"Location is available"}'],
      ["state", "checkpoint", "core-1", "--answer", "Yes"],
      ["mode", "change"],
      ["validate"],
    ];
    approveAll(app);
    for (const args of runs) assert.equal(cli(app, args).status, 0, args.join(" "));
    assert.deepEqual(snapshot(join(app, "docs/helix")), before);
    // And the write fence refuses it outright.
    assert.throws(() => writeInApp(app, "docs/helix/x.md", "x"), /refusing to write docs\/helix\/x\.md/);
  });

  // @covers US-123-AC5
  test("status --json lists each document with its type, ID and path", () => {
    const app = appWithDocs();
    const { documents } = JSON.parse(cli(app, ["status", "--json"]).stdout);
    assert.deepEqual(documents, [
      { path: "docs/ux-builder/baseline.md", type: "baseline", id: "baseline" },
      { path: "docs/ux-builder/brief.md", type: "experience-brief", id: "brief" },
    ]);
  });
});
