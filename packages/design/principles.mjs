/* Experience principles in HELIX (CONTRACT-008 Commands, FEAT-018 GDL-16,
   ADR-042 decision 2): each one a line under principles.md's *Experience
   Principles*, proposed for the person to apply. A principle a check can
   express also keeps its rule in .ux-builder/principles.json, keyed by its
   words, which ux-builder-blueprint check applies as a project rule. */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PRINCIPLE_KINDS } from "@ux-builder/ui/blueprint";
import { DesignError, writeInApp } from "./app.mjs";
import { documentOfType, proposeChange, requireHelix, sectionOf, setSection, slug } from "./helix.mjs";

export const PRINCIPLES_FILE = ".ux-builder/principles.json";
const HEADING = "Experience Principles";

/* Where principles.md is, or goes. */
function principlesPath(app) {
  return documentOfType(app, "principles")?.path ?? `${requireHelix(app, "an experience principle")}/01-frame/principles.md`;
}

/* The experience principles: [{ text, status }]; status confirmed once applied, assumed while proposed. */
export function experiencePrinciples(app) {
  const doc = documentOfType(app, "principles");
  if (!doc) return [];
  const onDisk = existsSync(join(app, doc.path)) ? sectionOf(readFileSync(join(app, doc.path), "utf8"), HEADING) ?? "" : "";
  const bullets = (t) => String(t ?? "").split("\n").map((l) => l.match(/^\s*[-*] (.+)$/)?.[1]?.trim()).filter((x) => x && !/^\[.*\]$/.test(x));
  const applied = new Set(bullets(onDisk));
  return bullets(sectionOf(doc.text, HEADING)).map((text) => ({ text, status: applied.has(text) ? "confirmed" : "assumed" }));
}

/* The checkable principles: { principles: [{ key, text, rule }] }. */
export function readPrinciplesFile(app) {
  try { return JSON.parse(readFileSync(join(app, PRINCIPLES_FILE), "utf8")); } catch { return { principles: [] }; }
}

/* ux-builder-design principle add --text <t> [--rule <json>]. */
export function principleAdd(app, { text, rule } = {}) {
  text = String(text ?? "").trim();
  if (!text) throw new DesignError("principle add needs --text: the principle, in the person's words");
  let parsed = null;
  if (rule != null && rule !== "") {
    try { parsed = typeof rule === "string" ? JSON.parse(rule) : rule; } catch (e) { throw new DesignError(`--rule is JSON such as {"kind":"no-step-before","patterns":["SignIn"]}: ${e.message}`); }
    if (!PRINCIPLE_KINDS.includes(parsed?.kind)) throw new DesignError(`a principle's rule kind is one of ${PRINCIPLE_KINDS.join(", ")}, not "${parsed?.kind ?? ""}"`);
  }
  const path = principlesPath(app);
  const p = proposeChange(app, path, (t) => {
    const base = t ?? ["---", "ddx:", "  id: principles", "  type: principles", "  authoring:", "    home: repo", "---", "", "# Principles", ""].join("\n");
    const lines = (sectionOf(base, HEADING) ?? "").split("\n").filter((l) => l.trim() && !/^\[.*\]$/.test(l.trim()));
    if (!lines.some((l) => l.replace(/^\s*[-*]\s*/, "").trim() === text)) lines.push(`- ${text}`);
    return setSection(base, HEADING, lines.join("\n"));
  });
  let checked = null;
  if (parsed) {
    const file = readPrinciplesFile(app);
    const key = slug(text);
    file.principles = [...(file.principles ?? []).filter((x) => (x.key ?? slug(x.text ?? "")) !== key), { key, text, rule: parsed }];
    writeInApp(app, PRINCIPLES_FILE, JSON.stringify(file, null, 2) + "\n");
    checked = { key, file: PRINCIPLES_FILE, kind: parsed.kind };
  }
  return { text, path, proposal: p.id ?? null, checked, status: "assumed" };
}

/* Principles still in an older design state, which belong in principles.md. */
export const statePrinciples = (state) => (state?.principles ?? []).filter((p) => p.status !== "refuted");
