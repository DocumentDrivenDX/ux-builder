/* Route clean-up shared by the ELK layouts: orthogonal polylines with no hairline jogs, and edge
   labels placed on their own line at its quietest free point (visuals PRD §5.1 "labeled at their
   quietest point, never crossing a node or its text"). */

const EPS = 0.5;

/** Join ELK sections into one orthogonal polyline: every point kept, an elbow where two differ on both axes, collinear points dropped. */
export function orthogonal(sections) {
  const pts = [];
  for (const section of sections) for (const p of section) {
    const last = pts.at(-1);
    if (!last) { pts.push([...p]); continue; }
    const [x, y] = [Math.abs(p[0] - last[0]) < EPS ? last[0] : p[0], Math.abs(p[1] - last[1]) < EPS ? last[1] : p[1]];
    if (x !== last[0] && y !== last[1]) {
      // Keep heading the way the previous segment went, then turn.
      const prev = pts.at(-2);
      const wasVertical = prev ? prev[0] === last[0] : Math.abs(y - last[1]) > Math.abs(x - last[0]);
      pts.push(wasVertical ? [last[0], y] : [x, last[1]]);
    }
    if (x !== pts.at(-1)[0] || y !== pts.at(-1)[1]) pts.push([x, y]);
  }
  return pts.filter((p, i) => {
    if (i === 0 || i === pts.length - 1) return true;
    const a = pts[i - 1], b = pts[i + 1];
    return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
  });
}

const ROOM = 28;
/* The distance between two boxes (0 when they touch or overlap). */
const gap = (a, b) => Math.hypot(Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w)), Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h)));

const overlaps = (a, b, gap = 2) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

/** The axis-aligned segments of a polyline as thin boxes. */
export const segmentBoxes = (points) => points.slice(1).map((p, i) => {
  const a = points[i];
  return { x: Math.min(a[0], p[0]), y: Math.min(a[1], p[1]), w: Math.abs(p[0] - a[0]), h: Math.abs(p[1] - a[1]) };
});

/**
 * The x of a region's label along its top edge: left-aligned when no edge crosses it there,
 * otherwise the first free stretch, then right-aligned.
 */
export function placeTopLabel(region, width, routes, inset = 12) {
  const band = { y: region.y + 4, h: 22 };
  const crossing = routes.flatMap(segmentBoxes).filter((s) => s.y < band.y + band.h && s.y + s.h > band.y);
  const free = (x) => !crossing.some((s) => s.x + s.w >= x - 4 && s.x <= x + width + 4);
  const inside = crossing.filter((s) => s.x + s.w >= region.x && s.x <= region.x + region.w);
  const candidates = [region.x + inset, ...inside.map((s) => s.x + s.w + 8).sort((a, b) => a - b), region.x + region.w - inset - width];
  const fits = candidates.find((x) => x >= region.x + inset && x + width <= region.x + region.w - inset + 0.5 && free(x));
  if (fits !== undefined) return { x: fits };
  // No free stretch inside: the first free one after the last crossing, widening the region to hold it.
  const after = Math.max(...inside.map((s) => s.x + s.w)) + 8;
  return free(after) ? { x: after, grow: after + width + inset - (region.x + region.w) } : { x: region.x + inset };
}

/**
 * Place each labelled edge's chip on its own route, at the first point along its longest
 * segments that overlaps no box, no other edge and no chip already placed.
 * @param {{id:string, points:number[][], size:{w:number,h:number}}[]} edges
 * @param {{x:number,y:number,w:number,h:number}[]} obstacles node boxes
 */
export function placeLabels(edges, obstacles) {
  const placed = new Map();
  const taken = [];
  const lines = edges.map((e) => ({ id: e.id, boxes: segmentBoxes(e.points) }));
  // Keep chips off every line's ends, where its arrowhead or cardinality marks are drawn.
  const END = 14;
  const ends = edges.flatMap((e) => [e.points[0], e.points.at(-1)]).filter(Boolean).map(([x, y]) => ({ x: x - END, y: y - END, w: 2 * END, h: 2 * END }));
  obstacles = [...obstacles, ...ends];
  for (const e of edges) {
    const others = lines.filter((l) => l.id !== e.id).flatMap((l) => l.boxes);
    if (!e.size) continue;
    const segments = e.points.slice(1).map((p, i) => ({ a: e.points[i], b: p, len: Math.hypot(p[0] - e.points[i][0], p[1] - e.points[i][1]) }))
      .sort((s, t) => t.len - s.len);
    let chosen = null;
    // First a spot clear of every other line, the one with the most room around it (a label next to a
    // bundle of lines is hard to read); then the same with the label on two lines, half as wide; failing
    // both, one that only crosses lines, never a box or a chip.
    const tries = [[true, e.size], ...(e.wrapped ? [[true, e.wrapped]] : []), [false, e.size]];
    for (const [strict, size] of tries) {
      let best = -1;
      for (const s of segments) {
        for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.12, 0.88]) {
          const cx = s.a[0] + (s.b[0] - s.a[0]) * t, cy = s.a[1] + (s.b[1] - s.a[1]) * t;
          const box = { x: Math.round(cx - size.w / 2), y: Math.round(cy - size.h / 2), w: size.w, h: size.h, ...(size.lines ? { lines: size.lines } : {}) };
          if (obstacles.some((o) => overlaps(box, o)) || taken.some((o) => overlaps(box, o, 4)) || (strict && others.some((o) => overlaps(box, o, 1)))) continue;
          // Room: the distance to the nearest other line, chip or box, counted up to ROOM; ties keep the earlier, longer spot.
          const room = Math.min(ROOM, ...[...others, ...taken, ...obstacles].map((o) => gap(box, o)));
          if (room > best) { best = room; chosen = box; }
        }
      }
      if (chosen) break;
    }
    if (!chosen && segments.length) {
      const s = segments[0];
      chosen = { x: Math.round((s.a[0] + s.b[0]) / 2 - e.size.w / 2), y: Math.round((s.a[1] + s.b[1]) / 2 - e.size.h / 2), w: e.size.w, h: e.size.h };
    }
    if (chosen) { placed.set(e.id, chosen); taken.push(chosen); }
  }
  return placed;
}

/** The scene's size: everything drawn, plus a margin, from the origin. */
export function fit(scene, margin = 24) {
  let right = scene.width, bottom = scene.height;
  for (const it of scene.items) {
    for (const b of [it.box, it.edge?.label, it.badge && { x: it.badge.cx - (it.badge.w ?? 2 * it.badge.r) / 2, y: it.badge.cy - it.badge.r, w: it.badge.w ?? 2 * it.badge.r, h: 2 * it.badge.r }].filter(Boolean)) {
      right = Math.max(right, b.x + b.w + margin); bottom = Math.max(bottom, b.y + b.h + margin);
    }
    for (const [x, y] of it.edge?.points ?? []) { right = Math.max(right, x + margin); bottom = Math.max(bottom, y + margin); }
  }
  return { ...scene, width: Math.ceil(right), height: Math.ceil(bottom) };
}
