/* Project rules from an app's experience principles (US-122-AC4; FEAT-018
   GDL-16; SD-006 Project rules).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { principleFindings } from "../blueprint/index.mjs";

const CLI = fileURLToPath(new URL("../blueprint/cli.mjs", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "bp-principles-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const s = (id, pattern, actions = []) => ({ id, title: id, pattern, states: ["empty", "loading", "error"], actions });
const BP = {
  version: 1, kind: "app", name: "rivers",
  supports: { sizeClasses: ["compact", "expanded"], inputs: ["coarse", "fine"] },
  destinations: [{ id: "find", label: "Find", screen: "sign-in" }],
  screens: [s("sign-in", "FormPage", [{ id: "continue", label: "Continue", to: "map", primary: true }]), s("map", "CollectionList", [{ id: "open", label: "Open", to: "modal:preview" }]), s("detail", "RecordDetail")],
  journeys: [{ id: "J-find", story: "US-001", entry: "sign-in", steps: [{ screen: "sign-in", action: "continue", inputs: { required: ["email", "password"] } }, { screen: "map", action: "open" }, { screen: "detail" }] }],
};
const NO_ACCOUNT = { id: "PR-1", text: "No mandatory account creation", rule: { kind: "no-step-before", screens: ["sign-in"] } };

describe("project rules", () => {
  // @covers US-122-AC4
  test("a principle 'no mandatory account creation' and a journey starting at sign-in: check reports a finding naming the principle", () => {
    const dir = join(tmp, "app");
    mkdirSync(join(dir, ".ux-builder"), { recursive: true });
    writeFileSync(join(dir, "app.blueprint.json"), JSON.stringify(BP));
    writeFileSync(join(dir, ".ux-builder/principles.json"), JSON.stringify({ principles: [NO_ACCOUNT, { id: "PR-2", text: "Progressive disclosure" }] }));
    const r = spawnSync(process.execPath, [CLI, "check", "app.blueprint.json", "--json"], { cwd: dir, encoding: "utf8" });
    const f = JSON.parse(r.stdout).filter((x) => x.rule.startsWith("project."));
    assert.equal(f.length, 1, JSON.stringify(f));
    assert.equal(f[0].rule, "project.PR-1");
    assert.equal(f[0].severity, "warning");
    assert.equal(f[0].path, "/journeys/0");
    assert.match(f[0].message, /Journey J-find starts on sign-in \(FormPage\).*\(principle PR-1: "No mandatory account creation"\)/);
  });

  test("the other rule kinds: max steps, max required inputs, no modal", () => {
    const f = principleFindings(BP, [
      { id: "PR-3", text: "Short journeys", rule: { kind: "max-steps", max: 2 } },
      { id: "PR-4", text: "Ask little", rule: { kind: "max-required-inputs", max: 1 } },
      { id: "PR-5", text: "No modals in finding", rule: { kind: "no-modal-in", journeys: ["J-find"] } },
      { id: "PR-6", text: "A by-pattern gate", rule: { kind: "no-step-before", patterns: ["FormPage"] } },
    ]);
    assert.deepEqual(f.map((x) => x.rule), ["project.PR-3", "project.PR-4", "project.PR-5", "project.PR-6"]);
    assert.match(f[1].message, /asks for 2 required inputs, more than 1/);
    assert.match(f[2].message, /opens a modal at map:open/);
  });

  test("with no principles file, there are no project findings", () => {
    const dir = join(tmp, "none");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "app.blueprint.json"), JSON.stringify(BP));
    const r = spawnSync(process.execPath, [CLI, "check", "app.blueprint.json", "--json"], { cwd: dir, encoding: "utf8" });
    assert.deepEqual(JSON.parse(r.stdout).filter((x) => x.rule.startsWith("project.")), []);
  });
});
