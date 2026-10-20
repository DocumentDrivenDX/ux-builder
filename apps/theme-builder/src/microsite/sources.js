/* The microsite's proof pages, generated from the project's own HELIX
   artifacts and changelogs at build time, so they cannot drift from the
   repository. Nothing here is typed by hand. */

import catalogue from "@ux-builder/ui/catalogue.json";
import aiComponents from "../../../../packages/ui/ai/vendor/components.json";

const raw = (files) => Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
const ADRS = import.meta.glob("../../../../docs/helix/02-design/adr/*.md", { eager: true, query: "?raw", import: "default" });
const FEATS = import.meta.glob("../../../../docs/helix/01-frame/features/*.md", { eager: true, query: "?raw", import: "default" });
const CONTRACTS = import.meta.glob("../../../../docs/helix/02-design/contracts/*.md", { eager: true, query: "?raw", import: "default" });
const LOGS = import.meta.glob("../../../../packages/*/CHANGELOG.md", { eager: true, query: "?raw", import: "default" });

export const REPO = "https://github.com/DocumentDrivenDX/ux-builder";
const blob = (path) => `${REPO}/blob/main/${path.replace(/^(\.\.\/)+/, "")}`;

const body = (md) => md.replace(/^---\n[\s\S]*?\n---\n/, "");
const title = (md) => body(md).match(/^# (.+)$/m)?.[1].trim() ?? "";
/* The first paragraph under a heading: prose only, tables and lists stop it. */
function paragraph(md, heading) {
  const at = body(md).split(new RegExp(`^## ${heading}\\s*$`, "m"))[1];
  if (!at) return "";
  const lines = [];
  for (const line of at.split("\n")) {
    if (!line.trim()) { if (lines.length) break; continue; }
    if (/^(#|\||>|```)/.test(line.trim())) { if (lines.length) break; continue; }
    lines.push(line.trim());
  }
  return lines.join(" ").replace(/:$/, ".");
}

export const DECISIONS = raw(ADRS).map(([path, md]) => {
  const t = title(md);
  const [id, ...rest] = t.split(": ");
  // The header table's first row: its date (an amendment noted after it) and its status's first word, as the ADR states it.
  const row = body(md).match(/^\|\s*(\d{4}-\d{2}-\d{2})[^|]*\|\s*([^|]+?)\s*\|/m);
  const status = (row?.[2] ?? "").replace(/\*\*/g, "").match(/^[A-Za-z]+/)?.[0] ?? "";
  return { id, title: rest.join(": "), date: row?.[1] ?? "", status, decision: paragraph(md, "Decision"), url: blob(path) };
});

export const FEATURES = raw(FEATS).map(([path, md]) => {
  const t = title(md).replace(/^Feature Specification:\s*/, "");
  const [id, ...rest] = t.split(" — ");
  return { id, title: rest.join(" — "), status: (body(md).match(/^\*\*Status\*\*:\s*([^\n(]+)/m)?.[1] ?? "").trim(), overview: paragraph(md, "Overview"), url: blob(path) };
});

export const CONTRACT_LIST = raw(CONTRACTS).map(([path, md]) => {
  const [, id, name] = body(md).match(/^\*\*Contract ID\*\*:\s*(\S+)\s+—\s+(.+)$/m) ?? [];
  return { id, title: name?.trim(), url: blob(path) };
});

/* Each package's published versions, newest first, with their change notes. */
export const RELEASES = raw(LOGS).map(([path, md]) => {
  const name = md.match(/^# (.+)$/m)?.[1].trim();
  const versions = md.split(/^## /m).slice(1).map((chunk) => {
    const [version, ...lines] = chunk.split("\n");
    const notes = lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2).replace(/^[0-9a-f]{7,}: /, "").replace(/^Updated dependencies.*/, "Updated its @ux-builder dependencies.").trim());
    return { version: version.trim(), notes };
  });
  return { name, versions, url: blob(path) };
});

export const WIDGETS = catalogue.widgets.filter((w) => w.type === "component").sort((a, b) => a.name.localeCompare(b.name));
export const PATTERNS = catalogue.patterns.filter((p) => p.type === "component").sort((a, b) => a.name.localeCompare(b.name));
export const AI = aiComponents.components;
export const ICON_COUNT = catalogue.iconLibrary.count;
