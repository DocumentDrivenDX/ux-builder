/* A run package to test increments 2 and 3 against: the fixture HELIX
   repository with a manifest, `assess collect` and `assess plan` already
   run, and helpers to write the agent's records. */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { findingId } from "../../assess/plan.mjs";
import { makeRepo } from "./helix-repo.mjs";

const CLI = fileURLToPath(new URL("../../cli.mjs", import.meta.url));

export function prepared({ files = {}, run = "R-20261021T090000Z", manifest = {} } = {}) {
  const r = makeRepo({ files });
  writeFileSync(join(r.dir, "ux-assessment.yml"), stringify({
    version: 1, app: { name: "Review app" },
    run: { baseUrl: "http://127.0.0.1:4173/", environment: "local" },
    roles: [{ id: "reviewer", auth: "none" }],
    fixtures: [{ id: "queue", reset: "node -e \"require('fs').writeFileSync('reset.flag', 'reset')\"" }],
    journeys: [
      { id: "J-review", story: "US-001", priority: "critical", role: "reviewer", fixture: "queue", entry: "/queue", states: ["success", "empty", "recoverable-error"], notApplicable: { loading: "instant", "system-failure": "local only", ai: "no model", "responsive-keyboard": "assessed elsewhere" } },
      { id: "J-undo", story: "US-002", priority: "important", role: "reviewer", entry: "/queue" },
    ],
    restrictions: { writes: "report-only" },
    ...manifest,
  }));
  const cli = (...args) => spawnSync(process.execPath, [CLI, "assess", ...args], { cwd: r.dir, encoding: "utf8" });
  const dir = join(r.dir, "ux-assessment", run);
  for (const args of [["collect", "--run", run], ["plan", "--run", run, "--agent", "test-agent", "--model", "test-model"]]) {
    const o = cli(...args);
    if (o.status !== 0) throw new Error(`${args[0]}: ${o.stderr}${o.stdout}`);
  }
  const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
  const write = (f, data) => { mkdirSync(dirname(join(dir, f)), { recursive: true }); writeFileSync(join(dir, f), typeof data === "string" ? data : JSON.stringify(data, null, 2)); };
  const finding = (over = {}) => {
    const f = {
      run_id: run, title: "Approving gives no confirmation", finding_type: "observed", journey_id: "J-review", state_id: "S-review-success", role: "reviewer",
      source_refs: ["US-001"], test_refs: ["test/queue.test.mjs"], evidence_refs: ["checkpoints/C-review-1/screenshot.png"],
      observed_behavior: "After Approve, the row disappears with no message.", expected_behavior_or_proposed_requirement: "US-001-AC2: the entry leaves the queue, and the reviewer can tell it was approved.",
      recommendation: "Show a toast with Undo (ToastProvider).", component_mapping: [], priority: "P2", confidence: { level: "high", reason: "seen at two checkpoints" }, effort: "S",
      dependencies: [], verification: "Approve an entry; a toast names it and offers Undo.", proposed_doc_changes: [], status: "open", ...over,
    };
    return { ...f, id: over.id ?? findingId(f) };
  };
  // A checkpoint's files, as assess inspect writes them.
  const checkpointAt = (id) => {
    write(`checkpoints/${id}/inspection.json`, { schema: "inspection", version: 1, checkpoint: { id }, mode: "in-place", findings: [] });
    write(`checkpoints/${id}/screenshot.png`, "png");
    write(`checkpoints/${id}/tree.yml`, "- main\n");
  };
  return { r, dir, run, cli, read, write, finding, checkpointAt, remove: () => r.remove() };
}
