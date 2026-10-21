/* A throwaway git repository with HELIX documents, for the assessment's
   tests (STP-056, STP-058): a .helix.yml marker, a small vendored catalogue
   (graph.yml and three artifact types), a vision, a PRD, a feature, two
   stories with criteria, an untyped story file, a test citing a criterion,
   and a package.json with test scripts.

     const repo = makeRepo({ marker, files }); ... repo.remove(); */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const fm = (id, type, extra = "") => `---\nddx:\n  id: ${id}\n  type: ${type}\n${extra}---\n\n`;
const meta = (id, activity, location, naming, pattern) => `artifact:\n  name: ${id}\n  id: ${id}\n  type: document\n  activity: ${activity}\ndescription: x\noutput:\n  location: ${location}\n  format: markdown\n${naming ? `  naming: ${naming}\n` : ""}${pattern ? `id_format:\n  prefix: ${pattern.split("-")[0]}\n  pattern: "${pattern}"\n` : ""}`;

export const DEFAULT_FILES = {
  ".helix.yml": "flows:\n  - id: helix\n    root: docs/helix/\n",
  "workflows/graph.yml": "version: 1\nnodes: []\n",
  "workflows/activities/00-discover/artifacts/product-vision/meta.yml": meta("product-vision", "discover", "docs/helix/00-discover/product-vision.md"),
  "workflows/activities/01-frame/artifacts/prd/meta.yml": meta("prd", "frame", "docs/helix/01-frame/prd.md", "prd.md"),
  "workflows/activities/01-frame/artifacts/feature-specification/meta.yml": meta("feature-specification", "frame", "docs/helix/01-frame/features/", "FEAT-{number}-{title-with-hyphens}.md", "FEAT-[0-9]{3}"),
  "workflows/activities/01-frame/artifacts/user-stories/meta.yml": meta("user-stories", "frame", "docs/helix/01-frame/user-stories/", "US-{number}-{slug}.md", "US-[0-9]{3}"),
  "workflows/activities/01-frame/artifacts/user-stories/template.md": "# US-XXX: [title]\n",
  "docs/helix/00-discover/product-vision.md": fm("helix.product-vision", "product-vision") + "# Vision\n\n## Goals\n\n- Reviewers clear the queue before prebill.\n",
  "docs/helix/01-frame/prd.md": fm("prd", "prd") + "# PRD\n\n### Primary Persona: Reviewer\n\n- **FR-1** — Review entries.\n",
  "docs/helix/01-frame/features/FEAT-001-review.md": fm("FEAT-001", "feature-specification", "  links:\n    - kind: informed_by\n      to: prd\n") + "# FEAT-001 — Review\n",
  "docs/helix/01-frame/user-stories/US-001-review-a-queue.md": fm("US-001", "user-stories", "  links:\n    - kind: informed_by\n      to: FEAT-001\n") + "# US-001: Review a queue\n\n## Acceptance Criteria\n\n- [ ] **US-001-AC1** — Given entries, when the queue opens, then they are listed.\n- [ ] **US-001-AC2** — Given an entry, when it is approved, then it leaves the queue.\n",
  "docs/helix/01-frame/user-stories/US-002-undo-an-approval.md": fm("US-002", "user-stories") + "# US-002: Undo\n\n## Acceptance Criteria\n\n- [ ] **US-002-AC1** — Given an approval, when Undo is chosen, then the entry returns.\n",
  "docs/helix/01-frame/user-stories/US-003-untyped.md": "# US-003: A story with no frontmatter\n\n- [ ] **US-003-AC1** — Given x, then y.\n",
  "test/queue.test.mjs": "// @" + "covers US-001-AC1\ntest('lists', () => {});\n",
  "package.json": JSON.stringify({ name: "review-app", scripts: { test: "node --test", "test:e2e": "playwright test", dev: "vite" } }, null, 2),
};

export function makeRepo({ files = {}, omit = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "helix-repo-"));
  const all = { ...DEFAULT_FILES, ...files };
  for (const [p, content] of Object.entries(all)) {
    if (omit.includes(p) || content == null) continue;
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), content);
  }
  const git = (...a) => execFileSync("git", ["-C", dir, ...a], { stdio: "ignore" });
  git("init", "-q"); git("config", "user.email", "t@example.test"); git("config", "user.name", "t"); git("config", "commit.gpgsign", "false");
  git("add", "-A"); git("commit", "-q", "-m", "fixture");
  return { dir, write: (p, c) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), c); }, remove: () => rmSync(dir, { recursive: true, force: true }) };
}
