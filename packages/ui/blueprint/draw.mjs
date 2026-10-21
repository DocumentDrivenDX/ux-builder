/* ux-builder-blueprint draw: the IA map, the flow and each journey, as
   Mermaid and SVG (FEAT-012 DRW-01; ADR-030 decision 6). Node only.

     import { drawings, writeDrawings } from "./draw.mjs";
     writeDrawings(drawings(blueprint), "blueprint-drawings");

   Each drawing is one graph (project.mjs) written twice: as a Mermaid
   flowchart (.mmd) and as SVG by svg.mjs's own layered layout, so no
   Mermaid renderer or browser is needed. The same blueprint gives the same
   files, byte for byte. */

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { flowGraph, iaGraph, journeyGraph, mermaid, screensOf } from "./project.mjs";
import { toSvg } from "./svg.mjs";

/* The drawings: [{ name, title, mermaid, svg }], in a fixed order. */
export function drawings(bp) {
  const screens = screensOf(bp);
  const out = [
    { name: "ia", title: "IA map", graph: iaGraph(bp), dir: "TB" },
    { name: "flow", title: "Screen flow", graph: flowGraph(bp), dir: "LR" },
    ...(Array.isArray(bp.journeys) ? bp.journeys : []).filter((j) => j && typeof j.id === "string")
      .map((j) => ({ name: `journey-${j.id}`, title: `Journey ${j.id}${j.story ? ` (${j.story})` : ""}`, graph: journeyGraph(j, screens), dir: "LR" })),
  ];
  return out.map(({ name, title, graph, dir }) => ({ name, title, mermaid: `---\ntitle: ${title}\n---\n${mermaid(graph, dir)}`, svg: toSvg(graph, dir) }));
}

/* Write each drawing as <name>.mmd and <name>.svg, replacing an earlier run's. */
export function writeDrawings(list, dir) {
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (/\.(mmd|svg)$/.test(f)) rmSync(join(dir, f));
  const files = [];
  for (const d of list) {
    writeFileSync(join(dir, `${d.name}.mmd`), d.mermaid);
    writeFileSync(join(dir, `${d.name}.svg`), d.svg);
    files.push(`${d.name}.mmd`, `${d.name}.svg`);
  }
  return files;
}
