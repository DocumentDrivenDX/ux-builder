/* The roadmap's Next and Later columns (Why / Roadmap, SD-002), read from
   the project's open work items (.ddx/beads.jsonl) when the site is built,
   so they move as the work does. Nothing here is written by hand except the
   rule that sorts an item:

     Later  the public-distribution epic (FEAT-005) and the open items under it
     Next   open build items (kind:build, kind:design-then-build,
            kind:frame-then-build) outside FEAT-005 and outside the site itself

   Decisions, alignment reviews, bugs and the site's own tasks are not
   roadmap items. */

import raw from "../../../../.ddx/beads.jsonl?raw";

const items = raw.split("\n").filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const open = items.filter((b) => b.status !== "closed");
const labels = (b) => b.labels ?? [];
const has = (b, l) => labels(b).includes(l);
const features = (b) => labels(b).filter((l) => l.startsWith("feat:")).map((l) => l.slice(5));
const BUILD = ["kind:build", "kind:design-then-build", "kind:frame-then-build"];

const distribution = open.find((b) => b.issue_type === "epic" && has(b, "feat:FEAT-005"));
const isLater = (b) => has(b, "feat:FEAT-005") || (distribution && b.parent === distribution.id);
const isSite = (b) => has(b, "area:microsite");

/* A work item as a roadmap line: its title without a leading story or requirement ID, and the features it serves. */
const line = (b) => ({ id: b.id, title: b.title.replace(/^(US|NAV|FEAT)-\d+:\s*/, ""), features: features(b) });
const byPriority = (a, b) => (a.priority ?? 9) - (b.priority ?? 9) || a.id.localeCompare(b.id);

export const NEXT = open.filter((b) => b.issue_type !== "epic" && labels(b).some((l) => BUILD.includes(l)) && !isLater(b) && !isSite(b)).sort(byPriority).map(line);
export const LATER = open.filter((b) => b.issue_type !== "epic" && isLater(b)).sort(byPriority).map(line);
export const LATER_EPIC = distribution ? line(distribution) : null;
