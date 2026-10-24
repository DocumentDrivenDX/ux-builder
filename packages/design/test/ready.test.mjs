/* The validated prototype and ready (US-136; FEAT-018 GDL-44 to GDL-46;
   ADR-037).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { writeInApp } from "../index.mjs";
import { approveAll, cli, tempApp } from "./helpers.mjs";

/* An app with a validated prototype: scripts that pass or fail, a blueprint
   whose journey covers two criteria, an audit report and its tests. */
function app({ lint = 0, bp = 0, auditErrors = 0, cite = ["US-001-AC1", "US-001-AC2"], faked = [], screens = ["map"], pages = screens, auditedAt = new Date(Date.now() + 60_000).toISOString() } = {}) {
  const a = tempApp({ state: { prototype: { branch: "docs/ux-builder/prototypes/map-first", alternative: "map-first" }, faked } });
  writeFileSync(join(a, "package.json"), JSON.stringify({ name: "rivers", private: true, scripts: { lint: `node -e "process.exit(${lint})"`, "check:blueprint": `node -e "process.exit(${bp})"` } }));
  writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify({ screens: screens.map((id) => ({ id })), journeys: [{ id: "J-find", story: "US-001", criteria: ["US-001-AC1", "US-001-AC2"], entry: "map", steps: [{ screen: "map" }] }] }));
  mkdirSync(join(a, "audit-report"), { recursive: true });
  writeFileSync(join(a, "audit-report/report.json"), JSON.stringify({ generatedAt: auditedAt, pages: pages.map((screen) => ({ screen })), summary: { error: auditErrors, warning: 0, info: 0 } }));
  mkdirSync(join(a, "e2e"), { recursive: true });
  writeFileSync(join(a, "e2e/find.spec.js"), cite.map((id) => `// @covers ${id}\n`).join(""));
  return a;
}
const ready = (a, ...args) => { const r = cli(a, ["ready", ...args, "--json"]); return { status: r.status, out: JSON.parse(r.stdout) }; };

describe("US-136: the validated prototype", () => {
  // @covers US-136-AC1
  test("AC1: status reports the branch as prototype: validated until core-3 is answered", () => {
    const a = app();
    assert.deepEqual(JSON.parse(cli(a, ["status", "--json"]).stdout).prototype, { branch: "docs/ux-builder/prototypes/map-first", status: "validated" });
    assert.match(cli(a, ["status"]).stdout, /Prototype: the validated prototype on docs\/ux-builder\/prototypes\/map-first is still a prototype \(core-3 not answered\)\./);
    approveAll(a);
    assert.equal(cli(a, ["state", "checkpoint", "core-3", "--answer", "Yes, build it"]).status, 0);
    assert.deepEqual(JSON.parse(cli(a, ["status", "--json"]).stdout).prototype, { branch: "docs/ux-builder/prototypes/map-first", status: "production" });
  });

  // @covers US-136-AC2
  test("AC2: ready --for testing refuses while lint, check:blueprint or the audit fails, naming each", () => {
    const { status, out } = ready(app({ lint: 1, bp: 1, auditErrors: 2 }), "--for", "testing");
    assert.equal(status, 1);
    assert.equal(out.ready, false);
    assert.deepEqual(out.checks.map((c) => [c.name, c.ok]), [["lint", false], ["check:blueprint", false], ["audit", false], ["audit is current", true], ["screens built", true]]);
    assert.equal(out.checks[2].detail, "2 errors");
    assert.equal(ready(app(), "--for", "testing").status, 0);
    // An audit older than the blueprint, and a planned screen no audited page is, both refuse.
    const stale = ready(app({ auditedAt: "2020-01-01T00:00:00Z", screens: ["map", "detail"], pages: [] }), "--for", "testing");
    assert.equal(stale.status, 1);
    assert.match(stale.out.checks.find((c) => c.name === "audit is current").detail, /^the audit \(2020-01-01 00:00\) is older than docs\/ux-builder\/blueprint\/app\.blueprint\.json \(.+\): run npm run audit$/);
    assert.match(stale.out.checks.find((c) => c.name === "screens built").detail, /^no audited page is map, detail: build them, mark each page with data-piq-screen="<id>"/);
  });

  // @covers US-136-AC3
  test("AC3: ready lists each faked item and each covered criterion no test cites, and exits 1 while any remain", () => {
    const a = app({ cite: ["US-001-AC1"], faked: [{ what: "River conditions", where: "screens/detail" }] });
    const r = cli(a, ["ready"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FAIL US-001-AC2: covered by a journey, cited by no test \(@covers US-001-AC2\)/);
    assert.match(r.stdout, /FAIL faked: River conditions \(screens\/detail\)/);
    assert.match(r.stdout, /Not ready for production\./);
  });

  // @covers US-136-AC4
  test("AC4: with every criterion cited, no audit error and nothing faked, ready passes and asks core-3, recorded with state checkpoint core-3", () => {
    const a = app();
    const { status, out } = ready(a);
    assert.equal(status, 0);
    assert.equal(out.ready, true);
    assert.deepEqual(out.uncited, []);
    assert.match(out.next, /Ask checkpoint core-3: "Is this validated enough to build\?" Then: ux-builder-design state checkpoint core-3 --answer/);
  });

  // @covers US-136-AC5
  test("AC5: no command in @ux-builder/design or @ux-builder/ui writes screen code into the app's src/", () => {
    assert.throws(() => writeInApp(tempApp(), "src/Map.jsx", "x"), /refusing to write src\/Map\.jsx/);
    const roots = [fileURLToPath(new URL("..", import.meta.url)), fileURLToPath(new URL("../../ui/blueprint", import.meta.url))];
    for (const root of roots) {
      for (const f of readdirSync(root).filter((x) => x.endsWith(".mjs"))) {
        const text = readFileSync(join(root, f), "utf8");
        assert.doesNotMatch(text, /(writeFileSync|writeInApp|cpSync|copyFileSync)\([^)]*["'`]src\//, `${f} writes under src/`);
      }
    }
  });
});
