/* A small, deterministic layered-graph renderer: boxes and arrows as SVG
   (FEAT-012 DRW-01). Internal to @ux-builder/ui/blueprint; draw.mjs uses it
   for the same graphs it writes as Mermaid, so no Mermaid renderer (and no
   headless browser) is needed to get an SVG. It is a sketch, not Mermaid's
   layout: nodes in layers by their distance from the first node, in the
   order they are found; edges forward are straight, edges back or within a
   layer curve around, a self-loop is an arc above its node.

     toSvg({ nodes: [{ id, label, sub?, shape }], edges: [{ from, to, label?, dashed? }] }, "LR") */

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const CHAR = 7, LINE = 16, PAD = 12;
const textWidth = (s, size = CHAR) => String(s ?? "").length * size;
const r1 = (n) => Math.round(n * 10) / 10;

/* Layers by breadth-first distance from the nodes with no way in (or the first node). */
function layers(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const out = new Map(ids.map((id) => [id, []]));
  const inbound = new Set();
  for (const e of graph.edges) if (out.has(e.from) && out.has(e.to) && e.from !== e.to) { out.get(e.from).push(e.to); inbound.add(e.to); }
  const layer = new Map();
  const queue = ids.filter((id) => !inbound.has(id));
  if (!queue.length && ids.length) queue.push(ids[0]);
  for (const id of queue) layer.set(id, 0);
  const visit = (q) => {
    while (q.length) {
      const id = q.shift();
      for (const to of out.get(id)) if (!layer.has(to)) { layer.set(to, layer.get(id) + 1); q.push(to); }
    }
  };
  visit([...queue]);
  // Nodes in a cycle no root reaches: start a new walk from the first of them.
  for (const id of ids) if (!layer.has(id)) { layer.set(id, 0); visit([id]); }
  return layer;
}

/* The graph as an SVG document; direction "LR" (left to right) or "TB". */
export function toSvg(graph, direction = "LR") {
  const lr = direction !== "TB";
  const layer = layers(graph);
  const size = new Map(graph.nodes.map((n) => {
    const w = Math.max(96, textWidth(n.label) + 2 * PAD, n.sub ? textWidth(n.sub, 6) + 2 * PAD : 0);
    return [n.id, { w, h: n.sub ? 2 * LINE + PAD + 4 : LINE + PAD + 8 }];
  }));
  const byLayer = [];
  for (const n of graph.nodes) (byLayer[layer.get(n.id)] ??= []).push(n);
  const gapMain = Math.min(220, Math.max(72, ...graph.edges.map((e) => textWidth(e.label) + 32)));
  const gapCross = 28, M = 24, OUT = 56;
  // Main axis: each layer as wide (LR) or tall (TB) as its largest node.
  const pos = new Map();
  let main = M;
  const extents = byLayer.map((nodes) => (nodes ?? []).reduce((a, n) => a + (lr ? size.get(n.id).h : size.get(n.id).w), 0) + gapCross * Math.max(0, (nodes ?? []).length - 1));
  const cross = Math.max(0, ...extents);
  byLayer.forEach((nodes = [], k) => {
    const thick = Math.max(0, ...nodes.map((n) => (lr ? size.get(n.id).w : size.get(n.id).h)));
    let c = M + OUT + (cross - extents[k]) / 2;
    for (const n of nodes) {
      const s = size.get(n.id);
      const x = lr ? main + (thick - s.w) / 2 : c, y = lr ? c : main + (thick - s.h) / 2;
      pos.set(n.id, { x, y, ...s });
      c += (lr ? s.h : s.w) + gapCross;
    }
    main += thick + gapMain;
  });
  const W = Math.ceil(lr ? main - gapMain + M : cross + 2 * M + 2 * OUT), H = Math.ceil(lr ? cross + 2 * M + 2 * OUT : main - gapMain + M);

  const parts = [];
  for (const e of graph.edges) {
    const a = pos.get(e.from), b = pos.get(e.to);
    if (!a || !b) continue;
    const dash = e.dashed ? ' stroke-dasharray="5 4"' : "";
    let d, lx, ly;
    if (e.from === e.to) {
      const x = a.x + a.w / 2, y = a.y;
      d = `M${r1(x - 16)},${r1(y)} C${r1(x - 28)},${r1(y - 34)} ${r1(x + 28)},${r1(y - 34)} ${r1(x + 16)},${r1(y)}`;
      lx = x; ly = y - 30;
    } else if (layer.get(e.to) > layer.get(e.from)) {
      const [x1, y1, x2, y2] = lr ? [a.x + a.w, a.y + a.h / 2, b.x, b.y + b.h / 2] : [a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y];
      d = `M${r1(x1)},${r1(y1)} L${r1(x2)},${r1(y2)}`;
      lx = (x1 + x2) / 2; ly = (y1 + y2) / 2 - (lr ? 6 : 0);
    } else {
      // Back, or within a layer: around the nearer outside (above or below for LR, left or right for TB).
      const mid = M + OUT + cross / 2;
      const near = lr ? (a.y + b.y + (a.h + b.h) / 2) / 2 < mid : (a.x + b.x + (a.w + b.w) / 2) / 2 < mid;
      const s = near ? -1 : 1;
      const [x1, y1, x2, y2] = lr
        ? [a.x + a.w / 2, near ? a.y : a.y + a.h, b.x + b.w / 2, near ? b.y : b.y + b.h]
        : [near ? a.x : a.x + a.w, a.y + a.h / 2, near ? b.x : b.x + b.w, b.y + b.h / 2];
      const bend = 30 + Math.abs(lr ? x1 - x2 : y1 - y2) / 8;
      const edge = lr ? (near ? Math.min(y1, y2) : Math.max(y1, y2)) + s * bend : (near ? Math.min(x1, x2) : Math.max(x1, x2)) + s * bend;
      const [cx1, cy1, cx2, cy2] = lr ? [x1, edge, x2, edge] : [edge, y1, edge, y2];
      d = `M${r1(x1)},${r1(y1)} C${r1(cx1)},${r1(cy1)} ${r1(cx2)},${r1(cy2)} ${r1(x2)},${r1(y2)}`;
      const peak = (lr ? (near ? Math.min(y1, y2) : Math.max(y1, y2)) : (near ? Math.min(x1, x2) : Math.max(x1, x2))) + s * bend * 0.75;
      lx = lr ? (x1 + x2) / 2 : peak; ly = lr ? peak : (y1 + y2) / 2;
    }
    parts.push(`<path class="edge" d="${d}" fill="none" stroke="#5f6670" stroke-width="1.4"${dash} marker-end="url(#arrow)"/>`);
    if (e.label) {
      const w = textWidth(e.label, 6.2) + 8;
      parts.push(`<rect x="${r1(lx - w / 2)}" y="${r1(ly - 9)}" width="${r1(w)}" height="16" rx="3" fill="#ffffff" fill-opacity="0.9"/>`, `<text x="${r1(lx)}" y="${r1(ly + 3)}" text-anchor="middle" font-size="11" fill="#3c4148">${esc(e.label)}</text>`);
    }
  }
  for (const n of graph.nodes) {
    const p = pos.get(n.id);
    const rx = n.shape === "pill" ? p.h / 2 : n.shape === "modal" ? 10 : 4;
    const fill = n.shape === "modal" ? "#f4f5f7" : n.shape === "pill" ? "#eef1f5" : "#ffffff";
    const inner = n.shape === "modal" ? `<rect x="${r1(p.x + 3)}" y="${r1(p.y + 3)}" width="${r1(p.w - 6)}" height="${r1(p.h - 6)}" rx="${rx - 2}" fill="none" stroke="#8a919b" stroke-width="0.8"/>` : "";
    const cx = p.x + p.w / 2;
    const label = n.sub
      ? `<text x="${r1(cx)}" y="${r1(p.y + PAD + 10)}" text-anchor="middle" font-size="13" font-weight="600" fill="#1d2126">${esc(n.label)}</text><text x="${r1(cx)}" y="${r1(p.y + PAD + 10 + LINE)}" text-anchor="middle" font-size="11" fill="#5f6670">${esc(n.sub)}</text>`
      : `<text x="${r1(cx)}" y="${r1(p.y + p.h / 2 + 4)}" text-anchor="middle" font-size="13" font-weight="600" fill="#1d2126">${esc(n.label)}</text>`;
    parts.push(`<g class="node" data-id="${esc(n.id)}"><rect x="${r1(p.x)}" y="${r1(p.y)}" width="${r1(p.w)}" height="${r1(p.h)}" rx="${rx}" fill="${fill}" stroke="#3c4148" stroke-width="1.2"/>${inner}${label}</g>`);
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#5f6670"/></marker></defs>`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    ...parts,
    "</svg>",
  ].join("\n") + "\n";
}
