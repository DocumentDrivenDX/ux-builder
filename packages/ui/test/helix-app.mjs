/* A HELIX-governed app in a temporary directory, for the blueprint's
   propose, draw and wireframes tests (FEAT-012): the .helix.yml marker,
   HELIX v0.18.0's templates installed as an app has them, a feature with
   two stories (one walkthrough still the template's, one already written),
   its solution design without a screen flow, the starter's DESIGN.md, and
   the review blueprint. No architecture and no story test plans yet. */

import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const PKG = join(ROOT, "packages/create-app/test/fixtures/helix-package/helix/skills/helix/references");
const MINE = join(ROOT, "packages/ui/test/fixtures/helix-templates");
export const BLUEPRINT = join(ROOT, "packages/ui/test/fixtures/review.blueprint.json");
const tmpl = (phase, type) => readFileSync(join(PKG, "activities", phase, "artifacts", type, "template.md"), "utf8");

const write = (dir, rel, text) => { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), text); };

/* The story template filled in, but for its Walkthrough. */
function story(id, title, criteria, walkthrough) {
  let t = tmpl("01-frame", "user-stories")
    .replace(/^---\n[\s\S]*?\n---\n/, `---\nddx:\n  id: ${id}\n  type: user-stories\n  status: draft\n  links:\n    - kind: informed_by\n      to: FEAT-012\n---\n`)
    .replace(/^# US-XXX: \[Story Title\]$/m, `# ${id}: ${title}`)
    .replace(/^\*\*Feature\*\*:.*$/m, "**Feature**: FEAT-012 — Time review");
  t = t.replace(/## Acceptance Criteria\n[\s\S]*?(?=\n## )/, `## Acceptance Criteria\n\n${criteria.map((c, i) => `- [ ] **${id}-AC${i + 1}** — ${c}`).join("\n")}\n`);
  if (walkthrough) t = t.replace(/## Walkthrough\n[\s\S]*?(?=\n## )/, `## Walkthrough\n\n${walkthrough}\n`);
  return t;
}

export function makeApp({ marker = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "bp-helix-"));
  if (marker) write(dir, ".helix.yml", "version: 1\nflows:\n  - id: helix\n    root: docs/helix/\ndefaults:\n  flow: helix\n");
  const refs = join(dir, ".claude/skills/helix/references");
  cpSync(join(PKG, "activities"), join(refs, "activities"), { recursive: true });
  cpSync(MINE, join(refs, "activities"), { recursive: true, filter: (p) => !p.endsWith("README.md") });
  write(dir, ".claude/skills/helix/HELIX-VERSION.json", JSON.stringify({ version: "0.18.0" }) + "\n");
  write(dir, "docs/helix/01-frame/features/FEAT-012-time-review.md", "---\nddx:\n  id: FEAT-012\n  type: feature-specification\n  status: draft\n---\n\n# Feature Specification: FEAT-012 — Time review\n\nReview time entries.\n");
  write(dir, "docs/helix/01-frame/user-stories/US-012-review-entries.md", story("US-012", "Review entries", ["Given an entry, when it is approved, then the queue moves on.", "Given the last entry, when it is approved, then the queue is empty."]));
  write(dir, "docs/helix/01-frame/user-stories/US-013-add-an-entry.md", story("US-013", "Add an entry", ["Given the list, when an entry is saved, then it is listed."], "1. The user opens Entries and presses Import.\n2. The user uploads a file; the entries are listed."));
  write(dir, "docs/helix/02-design/solution-designs/SD-012-time-review.md", "---\nddx:\n  id: SD-012\n  type: solution-design\n  status: draft\n  links:\n    - kind: informed_by\n      to: FEAT-012\n---\n\n# Solution Design: SD-012 — Time review\n\n**Feature**: [[FEAT-012]]\n\n## Scope\n\nThe review queue and its entries.\n\n## System Decomposition\n\n### Component: Queue\n\n- **Purpose**: Shows the next entry.\n\n## Risks\n\nNone yet.\n");
  write(dir, "docs/helix/02-design/DESIGN.md", "---\nddx:\n  id: design-system\n  type: design-system\n  status: draft\n---\n\n# DESIGN.md — Time review\n\n## Navigation and Active State\n\nAppShell places the navigation; the current destination carries `aria-current=\"page\"`.\n\n## Visual Hierarchy\n\nOne primary action per region.\n");
  return { dir, blueprint: join(dir, "app.blueprint.json"), write: (rel, text) => write(dir, rel, text), init: () => cpSync(BLUEPRINT, join(dir, "app.blueprint.json")) };
}
