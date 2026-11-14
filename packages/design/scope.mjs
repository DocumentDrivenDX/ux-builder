/* ux-builder-design scope: everything the design asks of its users and its
   builders, as one list for the person to cut before the design grows
   (VIP List session 2: agents designing alone added stories, criteria and
   fields; the person's part is keeping the first release small). */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fieldFor } from "@ux-builder/ui/blueprint/samples";
import { bpFile } from "./app.mjs";
import { stories } from "./review.mjs";
import { parseDocument } from "./documents.mjs";

const list = (x) => (Array.isArray(x) ? x : []);

export function scope(app) {
  const bp = existsSync(join(app, bpFile(app))) ? JSON.parse(readFileSync(join(app, bpFile(app)), "utf8")) : {};
  const us = stories(app);
  const storyRows = Object.entries(us).map(([id, s]) => {
    const body = parseDocument(s.text).body;
    return { id, title: body.match(/^# (?:US-\d+:\s*)?(.+)$/m)?.[1] ?? id, criteria: (body.match(/\*\*US-\d+-AC\d+\*\*/g) ?? []).length };
  });
  const FORMS = /FormPage|Wizard|QuickEdit/;
  const inputs = [
    ...list(bp.screens).filter((s) => FORMS.test(s.pattern ?? "")).flatMap((s) => list(s.content).map((c) => (typeof c === "string" ? c : c?.label)).filter(Boolean).map((label) => ({ where: s.title ?? s.id, label, required: fieldFor(label).required && fieldFor(label).kind !== "checkbox" }))),
    ...list(bp.tasks).flatMap((t) => list(t.inputs?.required).map((label) => ({ where: t.id, label, required: true }))),
  ];
  const seen = new Set();
  const unique = inputs.filter((i) => { const k = `${i.label.toLowerCase().replace(/\s*\(.*\)$/, "")}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const r = {
    stories: storyRows, criteria: storyRows.reduce((n, s) => n + s.criteria, 0),
    destinations: list(bp.destinations).map((d) => d.label ?? d.id), screens: list(bp.screens).length,
    required: unique.filter((i) => i.required), optional: unique.filter((i) => !i.required),
    rules: list(bp.businessRules).map((x) => x.id),
  };
  r.text = [
    `The design's scope, for the person to cut: ${r.stories.length} stories with ${r.criteria} acceptance criteria, ${r.screens} screens, ${r.destinations.length} destinations (${r.destinations.join(", ") || "none"}), ${r.required.length} required inputs, ${r.rules.length} business rules.`,
    "", "Stories:", ...r.stories.map((s) => `  ${s.id} ${s.title} (${s.criteria} criteria)`),
    "", "What people must give:", ...(r.required.length ? r.required.map((i) => `  ${i.label} (${i.where})`) : ["  nothing"]),
    ...(r.optional.length ? ["", "What they may give:", ...r.optional.map((i) => `  ${i.label} (${i.where})`)] : []),
    "", "Ask: which of these can wait for a later release, and which input can people be spared?",
  ].join("\n");
  return r;
}
