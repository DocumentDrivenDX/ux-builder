/* The heuristic inspection pass, the information-hierarchy check, and
   inspecting an exploratory prototype like the app (FEAT-018 GDL-50,
   GDL-51; US-138; CONTRACT-008 "Amendment to CONTRACT-006").

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { writePrototype } from "@ux-builder/ui/blueprint/prototype";
import { audit } from "../audit.mjs";
import { HEURISTICS, informationHierarchy, pageText } from "../assess/heuristics.mjs";
import { validateReport } from "../assess/validate-report.mjs";
import { prepared } from "./fixtures/run-package.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const CLI = join(PKG, "cli.mjs");
const made = [];
after(() => { for (const p of made) p.remove?.(); });
const pkg = () => { const p = prepared(); made.push(p); return p; };
const st = ["empty", "loading", "error"];
const BP = {
  version: 1, kind: "app", name: "review", supports: { sizeClasses: ["compact"], inputs: ["coarse"] },
  destinations: [{ id: "queue", label: "Queue", screen: "queue" }],
  screens: [
    { id: "queue", title: "Queue", pattern: "CollectionList", states: st, content: [{ label: "Entries waiting" }, { label: "Filters" }], actions: [{ id: "open", label: "Open", to: "entry", primary: true }] },
    { id: "entry", title: "Entry", pattern: "RecordDetail", states: st, content: [{ label: "Amount" }, { label: "Requester" }, { label: "History" }] },
    { id: "settings", title: "Settings", pattern: "SettingsPage", states: st },
  ],
  journeys: [{ id: "J-review", story: "US-001", entry: "queue", steps: [{ screen: "queue", action: "open" }, { screen: "entry" }] }],
};
/* A walked run: J-review went through queue and entry. */
function walked() {
  const p = pkg();
  writeFileSync(join(p.r.dir, "app.blueprint.json"), JSON.stringify(BP));
  p.write("walkthrough.json", { schema: "walkthrough", version: 1, journeys: [{ id: "J-review", status: "completed", steps: [
    { n: 1, action: "open the queue", screen: "queue", status: "done" },
    { n: 2, action: "open the first entry", screen: "entry", status: "done" },
  ] }] });
  p.write("coverage.json", { schema: "coverage", version: 1, entries: p.read("coverage.json").entries });
  return p;
}
const audits = (p, ...args) => spawnSync(process.execPath, [CLI, "assess", ...args], { cwd: p.r.dir, encoding: "utf8" });

describe("US-138: the assessment runs a heuristic inspection pass", () => {
  // @covers US-138-AC1
  test("AC1: assess heuristics records an entry for every heuristic of the pass on every walked screen, each a finding or checked: no finding", () => {
    const p = walked();
    const start = audits(p, "heuristics", p.dir);
    assert.equal(start.status, 0, start.stderr);
    assert.match(start.stdout, /2 walked screens × 13 heuristics; 26 to record; not inspected: settings/);
    let rec = p.read("heuristics.json");
    assert.deepEqual(rec.screens, ["queue", "entry"]);
    assert.deepEqual(rec.notInspected, ["settings"], "a screen not walked is not inspected, never clean");
    assert.deepEqual(HEURISTICS.slice(0, 10).map((h) => h.source).every((s) => /Nielsen/.test(s)), true);
    assert.deepEqual(HEURISTICS.slice(10).map((h) => h.id), ["error-handling", "information-hierarchy", "navigation-complexity"]);
    // The agent records each result: one finding, the rest no finding.
    const f = p.finding({ state_id: "S-review-success" });
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [f], user_validation: [] });
    for (const screen of rec.screens) for (const h of HEURISTICS) {
      const args = screen === "entry" && h.id === "visibility" ? ["--finding", f.id] : ["--no-finding"];
      assert.equal(audits(p, "heuristics", p.dir, "--screen", screen, "--heuristic", h.id, ...args).status, 0);
    }
    rec = p.read("heuristics.json");
    assert.equal(rec.entries.length, 26);
    assert.ok(rec.entries.every((e) => e.finding || e.checked === "no finding"));
    assert.equal(rec.entries.find((e) => e.screen === "entry" && e.heuristic === "visibility").finding, f.id);
    // Running it again keeps what was recorded.
    audits(p, "heuristics", p.dir);
    assert.deepEqual(p.read("heuristics.json").entries, rec.entries);
    assert.deepEqual(validateReport(p.dir).filter((x) => x.file === "heuristics.json"), []);
    assert.equal(audits(p, "heuristics", p.dir, "--screen", "settings", "--heuristic", "help", "--no-finding").status, 2, "settings was not walked");
    // The report lists every heuristic checked, with its findings and the screens where it found none.
    audits(p, "report", p.dir);
    const md = readFileSync(join(p.dir, "report.md"), "utf8");
    assert.match(md, /## Heuristics checked\n\nEach walked screen was checked against 13 heuristics: Visibility of system status;/);
    assert.match(md, new RegExp(`- \\*\\*entry\\*\\*: visibility → ${f.id}; checked, no finding: match, control,`));
    assert.match(md, /Not inspected \(no step reached them; not clean\): settings\./);
  });

  // @covers US-138-AC2
  test("AC2: a walked screen missing a heuristic fails validate-report, naming the screen and the heuristic", () => {
    const p = walked();
    audits(p, "heuristics", p.dir);
    for (const screen of ["queue", "entry"]) for (const h of HEURISTICS) if (!(screen === "entry" && h.id === "information-hierarchy")) audits(p, "heuristics", p.dir, "--screen", screen, "--heuristic", h.id, "--no-finding");
    const r = audits(p, "validate-report", p.dir);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /heuristics\.json \/entries {2}entry × information-hierarchy has no entry: record a finding or checked: no finding/);
    // Taken out of the record altogether, it is still missing.
    const rec = p.read("heuristics.json");
    rec.entries = rec.entries.filter((e) => !(e.screen === "queue" && e.heuristic === "help"));
    p.write("heuristics.json", rec);
    assert.ok(validateReport(p.dir).some((x) => x.message.startsWith("queue × help has no entry")));
  });

  // @covers US-138-AC3
  test("AC3: the information-hierarchy check names the first content out of the declared order", () => {
    const declared = BP.screens[1].content;
    const html = `<main data-piq-screen="entry"><h2>Requester</h2><p>Ana</p><h2>Amount</h2><p>€40</p><h2>History</h2></main>`;
    const r = informationHierarchy(declared, pageText(html));
    assert.equal(r.ok, false);
    assert.equal(r.finding.content, "Requester");
    assert.equal(r.finding.before, "Amount");
    assert.match(r.finding.message, /"Requester" is shown before "Amount", which the blueprint ranks higher/);
    assert.equal(informationHierarchy(declared, pageText(`<h2>Amount</h2><h2>Requester</h2><h2>History</h2>`)).ok, true);
    // From an inspection's accessibility tree as well, and from the command line.
    assert.equal(informationHierarchy(declared, pageText(`- main:\n  - heading "Amount" [level=2]\n  - heading "History" [level=2]\n  - heading "Requester" [level=2]\n`)).finding.content, "History");
    const p = walked();
    writeFileSync(join(p.r.dir, "entry.html"), html);
    const out = audits(p, "hierarchy", "--page", "entry.html");
    assert.equal(out.status, 1);
    assert.match(out.stdout, /^entry: "Requester" is shown before "Amount"/);
  });

  // @covers US-138-AC4
  test("AC4: an exploratory prototype in prototype/<name>/ is inspected like the app's pages, matched by data-piq-screen", async () => {
    const root = mkdtempSync(join(tmpdir(), "proto-assess-"));
    made.push({ remove: () => rmSync(root, { recursive: true, force: true }) });
    await writePrototype(BP, { root: join(root, "prototype"), dir: "queue-first", question: "Does the queue come first?" });
    const dir = join(root, "prototype/queue-first");
    const server = createServer((req, res) => {
      const f = join(dir, new URL(req.url, "http://x").pathname);
      if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "content-type": { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" }[extname(f)] ?? "application/octet-stream" });
      res.end(readFileSync(f));
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      const out = join(root, "audit");
      const r = await audit({ urls: ["/queue.compact.html", "/entry.compact.html"].map((u) => base + u), themes: ["praxis-carbon"], appearances: ["light"], blueprint: BP, out, cwd: PKG });
      assert.deepEqual(r.pages.map((x) => [x.screen, x.screenVia]), [["queue", "data-piq-screen"], ["entry", "data-piq-screen"]]);
      // The prototype's own content block keeps the declared order; its bar is left out of the check.
      const page = readFileSync(join(dir, "entry.compact.html"), "utf8");
      assert.equal(informationHierarchy(BP.screens[1].content, pageText(page)).ok, true);
      writeFileSync(join(root, "app.blueprint.json"), JSON.stringify(BP));
      const cli = spawnSync(process.execPath, [CLI, "assess", "hierarchy", "--page", "prototype/queue-first/entry.compact.html"], { cwd: root, encoding: "utf8" });
      assert.equal(cli.status, 0, cli.stderr + cli.stdout);
      assert.match(cli.stdout, /^entry: content in priority order \(Amount, Requester, History\)/);
    } finally { server.close(); }
  });
});
