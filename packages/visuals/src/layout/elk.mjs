/* ELK (elkjs 0.12.0, ADR-042) in process, with a fixed seed and every coordinate in one space. */

import ELK from "elkjs/lib/elk.bundled.js";
import { orthogonal } from "./route.mjs";

const elk = new ELK();

export const BASE = {
  "elk.algorithm": "layered",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.randomSeed": "1",
  "elk.json.shapeCoords": "ROOT",
  "elk.json.edgeCoords": "ROOT",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.edgeLabels.inline": "true",
  "elk.edgeLabels.placement": "CENTER",
  "elk.spacing.nodeNode": "28",
  "elk.layered.spacing.nodeNodeBetweenLayers": "64",
  "elk.spacing.edgeNode": "18",
  "elk.spacing.edgeEdge": "22",
  "elk.layered.spacing.edgeNodeBetweenLayers": "20",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "22",
  "elk.spacing.edgeLabel": "4",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.padding": "[top=24,left=24,bottom=24,right=24]",
};

export const layout = (graph) => elk.layout(graph);

/** Every node in a laid-out ELK graph, by id, with absolute boxes. */
export function boxes(root) {
  const out = new Map();
  const walk = (n) => { for (const c of n.children ?? []) { out.set(c.id, { x: c.x, y: c.y, w: c.width, h: c.height, node: c }); walk(c); } };
  walk(root);
  return out;
}

/** Every edge in a laid-out ELK graph, by id: one orthogonal polyline. */
export function routes(root) {
  const out = new Map();
  const walk = (n) => {
    for (const e of n.edges ?? []) {
      const sections = (e.sections ?? []).map((s) => [[s.startPoint.x, s.startPoint.y], ...(s.bendPoints ?? []).map((b) => [b.x, b.y]), [s.endPoint.x, s.endPoint.y]]);
      out.set(e.id, { points: orthogonal(sections) });
    }
    for (const c of n.children ?? []) walk(c);
  };
  walk(root);
  return out;
}
