/* ux-builder-blueprint draw: the IA map, the flow, each journey and each
   screen's interaction states, as Mermaid and SVG (FEAT-012 DRW-01; FEAT-015
   RPT-09; ADR-030 decision 6). Node only.

     import { drawings, writeDrawings } from "./draw.mjs";
     writeDrawings(drawings(blueprint), "blueprint-drawings");

   Each drawing is one graph (project.mjs, states.mjs) written twice: as
   Mermaid (.mmd) and as SVG by svg.mjs's own layered layout, so no Mermaid
   renderer or browser is needed. A screen's states are a Mermaid
   stateDiagram-v2 (states-<screen>.mmd) with every state it declares and the
   transitions between them, and states-<screen>.md holds that diagram with
   the state table (what the user sees, the action available, the
   announcement) and notes: the default transitions drawn, and the states
   the screen does not declare. The same blueprint gives the same files,
   byte for byte. */

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { flowGraph, iaGraph, journeyGraph, mermaid, screensOf } from "./project.mjs";
import { stateDiagram, stateGraph, stateMarkdown, stateModels } from "./states.mjs";
import { toSvg } from "./svg.mjs";

const safe = (id) => id.replace(/[^A-Za-z0-9_-]/g, "_");

/* The drawings: [{ name, title, mermaid, svg, markdown? }], in a fixed order. */
export function drawings(bp) {
  const screens = screensOf(bp);
  const out = [
    { name: "ia", title: "IA map", graph: iaGraph(bp), dir: "TB" },
    { name: "flow", title: "Screen flow", graph: flowGraph(bp), dir: "LR" },
    ...(Array.isArray(bp.journeys) ? bp.journeys : []).filter((j) => j && typeof j.id === "string")
      .map((j) => ({ name: `journey-${j.id}`, title: `Journey ${j.id}${j.story ? ` (${j.story})` : ""}`, graph: journeyGraph(j, screens), dir: "LR" })),
  ].map(({ name, title, graph, dir }) => ({ name, title, mermaid: `---\ntitle: ${title}\n---\n${mermaid(graph, dir)}`, svg: toSvg(graph, dir) }));
  for (const m of stateModels(bp)) {
    const title = `States of ${m.title}`;
    out.push({ name: `states-${safe(m.screen)}`, title, screen: m.screen, mermaid: `---\ntitle: ${title}\n---\n${stateDiagram(m)}`, svg: toSvg(stateGraph(m), "LR"), markdown: stateMarkdown(m), notes: m.notes, missing: m.missing });
  }
  return out;
}

/* Write each drawing as <name>.mmd and <name>.svg (and a state drawing's
   <name>.md), replacing an earlier run's. */
export function writeDrawings(list, dir) {
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (/\.(mmd|svg)$/.test(f) || /^states-.*\.md$/.test(f)) rmSync(join(dir, f));
  const files = [];
  for (const d of list) {
    writeFileSync(join(dir, `${d.name}.mmd`), d.mermaid);
    writeFileSync(join(dir, `${d.name}.svg`), d.svg);
    files.push(`${d.name}.mmd`, `${d.name}.svg`);
    if (d.markdown) { writeFileSync(join(dir, `${d.name}.md`), d.markdown); files.push(`${d.name}.md`); }
  }
  return files;
}
