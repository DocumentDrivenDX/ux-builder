/* flow/zoned (visuals PRD §5.1): own placement, ported from HELIX documentor's deploy.py, because ELK
   cannot match it (ADR-042). Tiers are bands top to bottom; a tier's zones share the width by how
   many boxes each holds, and a zone's boxes share its width. Every line between adjacent tiers takes
   its own lane in the gap between them, lanes ordered so their runs cross as few ends as swaps
   allow, and each box's exits ordered by where their lines go. A line that skips a tier runs down a
   corridor on the left; one between neighbours with no room for its label loops through a gap.
   Labels read "what · why" and sit where the fewest lines pass; zone headers slide clear of lines,
   and a zone's caption (its group detail) sits along its bottom, sliding clear of them too. Lines
   end in accent heads. Neighbours a line joins, in one zone or at the facing ends of adjacent zones
   in a tier, join side to side. */

import { TOKENS, TYPE, WEIGHT, badges, drawEdge, edgePaint, nodePaint, roleMark, stepsOf } from "../grammar.mjs";
import { fit } from "./route.mjs";

const WIDTH = 1120, ZONE_GAP = 16, BOX_GAP = 12, PAD = 12, HEAD = 34, MARGIN = 22, LANE = 30, CORRIDOR = 14;
const MARK = 14, NAME = 14, DETAIL = 12, LABEL = 12, HEADER = 11.5, TRACKING = 0.06, CAPTION = 12, CAPTION_H = 22;

const labelOf = (e) => (e.why ? `${e.label ?? ""} · ${e.why}`.replace(/^ · /, "") : e.label ?? "");

export function layoutZoned(v, { theme, m }) {
  const groups = v.groups ?? [];
  const groupOf = new Map(groups.map((g) => [g.id, g]));
  // A node's zone is its outermost group; that zone's tier is the node's tier, ranked 1, 2, … in order.
  const rootOf = (id) => { let g = groupOf.get(id); while (g?.parent) g = groupOf.get(g.parent); return g; };
  const zoneOf = new Map(v.nodes.map((n) => [n.id, rootOf(n.group)]));
  const edges = (v.edges ?? []).filter((e) => e.from !== e.to);
  const roots = groups.filter((g) => !g.parent);
  const membersOf = (z) => v.nodes.filter((n) => zoneOf.get(n.id).id === z.id);
  // Tiers ranked 1, 2, … from the zones' own. A zone whose boxes only send lines sits in the tier just
  // above the first tier they reach (a deploy principal beside what it deploys, not two tiers above).
  const declared = [...new Set(roots.map((g) => g.tier))].sort((a, b) => a - b);
  const zoneTier = new Map(roots.map((z) => [z.id, declared.indexOf(z.tier) + 1]));
  for (const z of roots) {
    const ids = new Set(membersOf(z).map((n) => n.id));
    const incoming = edges.some((e) => ids.has(e.to) && !ids.has(e.from));
    const outgoing = edges.filter((e) => ids.has(e.from) && !ids.has(e.to));
    if (incoming || !outgoing.length) continue;
    const nearest = Math.min(...outgoing.map((e) => zoneTier.get(zoneOf.get(e.to).id)));
    if (nearest - 1 > zoneTier.get(z.id)) zoneTier.set(z.id, nearest - 1);
  }
  const ranked = [...new Set(zoneTier.values())].sort((a, b) => a - b);
  for (const [id, t] of zoneTier) zoneTier.set(id, ranked.indexOf(t) + 1);
  const tierOf = (id) => zoneTier.get(zoneOf.get(id).id);
  const tiers = ranked.map((_, i) => ({ tier: i + 1, zones: roots.filter((z) => zoneTier.get(z.id) === i + 1)
    .map((z) => ({ zone: z, members: membersOf(z) })).filter((z) => z.members.length) }));
  const header = (z) => z.label.toUpperCase();
  const headerWidth = (z) => m.width(header(z), HEADER, WEIGHT.bold) + header(z).length * HEADER * TRACKING;
  const captionWidth = (z) => (z.detail ? m.width(z.detail, CAPTION, WEIGHT.regular) : 0);
  const captionH = (z) => (z.detail ? CAPTION_H : 0);

  // A line between neighbours in one zone runs straight from side to side; its tag wraps to fit between them.
  const SIDE_TEXT = 150, ARROW_ROOM = 16;
  const between = (a, b) => edges.find((e) => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id));
  // Every line joining two boxes, either way: a call and its return run as two parallel tracks.
  const allBetween = (a, b) => edges.filter((e) => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id));
  const sideTag = (e) => {
    const lines = m.wrap(labelOf(e), LABEL, WEIGHT.regular, SIDE_TEXT);
    return { lines, w: Math.ceil(Math.max(...lines.map((l) => m.width(l, LABEL, WEIGHT.regular)), 0) + 12), h: lines.length * m.lineHeight(LABEL) + 6 };
  };
  const oneLine = (text) => ({ lines: [text], w: Math.ceil(m.width(text, LABEL, WEIGHT.regular) + 12), h: m.lineHeight(LABEL) + 3 });
  // Two (or n) lines as even as the words allow.
  const nLines = (text, n) => {
    const full = m.width(text, LABEL, WEIGHT.regular);
    if (!text || !full) return oneLine(text);
    for (let w = full / n; w <= full; w += 8) {
      const lines = m.wrap(text, LABEL, WEIGHT.regular, w);
      if (lines.length <= n) return { lines, w: Math.ceil(Math.max(...lines.map((x) => m.width(x, LABEL, WEIGHT.regular))) + 12), h: lines.length * m.lineHeight(LABEL) + 6 };
    }
    return oneLine(text);
  };
  const twoLines = (text) => nLines(text, 2);
  const sideGap = (e) => (labelOf(e) ? sideTag(e).w : 0) + 2 * ARROW_ROOM + 8;
  // Boxes: a tier's zones share the width by their box count; text centred and wrapped to the box.
  // A role mark sits in the top-left corner; centred text keeps clear of it on both sides.
  const marked = (n) => n.role === "actor" || n.role === "store" || n.role === "document";
  const inset = (n) => (marked(n) ? 2 * (MARK + 14) : 0);
  const nameLines = (n, w) => m.wrap(n.label, NAME, WEIGHT.bold, w - 24 - inset(n));
  const detailLines = (n, w) => (n.detail ? m.wrap(n.detail, DETAIL, WEIGHT.regular, w - 28 - inset(n)) : []);
  // Room to keep a name on one line where it can (at most 240px), and never less than its longest word.
  const minBox = (n) => Math.max(120, Math.min(240, m.width(n.label, NAME, WEIGHT.bold) + 28 + inset(n)),
    ...n.label.split(/\s+/).map((w) => m.width(w, NAME, WEIGHT.bold) + 28 + inset(n)));
  const gapsOf = (members) => members.slice(1).map((n, i) => { const es = allBetween(members[i], n); return es.length ? Math.max(...es.map(sideGap)) : BOX_GAP; });
  const needOf = (zone, members) => Math.max(headerWidth(zone) + 2 * PAD, captionWidth(zone) + 2 * PAD,
    members.length * Math.max(...members.map(minBox)) + 2 * PAD + gapsOf(members).reduce((a, g) => a + g, 0));
  // Adjacent zones in a tier stand apart by the tag of a line joining their facing boxes.
  const facingEdge = (a, b) => between(a.members.at(-1), b.members[0]);
  const zoneGaps = (list) => list.slice(1).map((z, i) => { const e = facingEdge(list[i], z); return e ? Math.max(ZONE_GAP, sideGap(e) - 2 * PAD) : ZONE_GAP; });
  let width;
  const measure = () => { width = Math.max(WIDTH, ...tiers.map((t) => t.zones.reduce((s, z) => s + needOf(z.zone, z.members), 0) + zoneGaps(t.zones).reduce((a, g) => a + g, 0))); };
  measure();
  function place(lanes) {
    const boxes = new Map(), zones = new Map(), bands = new Map();
    let top = 0;
    for (const { tier, zones: list } of tiers) {
      const zgaps = zoneGaps(list), inner = width - zgaps.reduce((a, g) => a + g, 0);
      const total = list.reduce((s, z) => s + z.members.length, 0);
      // Neighbours a line joins stand apart by that line's tag; others by the usual gap.
      // Each zone first gets what its boxes need (equal boxes, each as wide as its widest needs);
      // what is left is shared by box count.
      const need = list.map(({ zone, members }) => needOf(zone, members));
      const spare = inner - need.reduce((a, f) => a + f, 0);
      let x = 0, bottom = top;
      for (const [zi, { zone, members }] of list.entries()) {
        const zw = need[zi] + spare * members.length / total;
        const gaps = gapsOf(members);
        const bw = (zw - 2 * PAD - gaps.reduce((a, g) => a + g, 0)) / members.length;
        const bh = 18 + Math.max(...members.map((n) => nameLines(n, bw).length * m.lineHeight(NAME) + (n.detail ? 2 + detailLines(n, bw).length * m.lineHeight(DETAIL) : 0)));
        zones.set(zone.id, { x, y: top, w: zw, h: HEAD + bh + PAD + captionH(zone) });
        let bx = x + PAD;
        members.forEach((n, i) => { boxes.set(n.id, { x: bx, y: top + HEAD, w: bw, h: bh }); bx += bw + (gaps[i] ?? 0); });
        bottom = Math.max(bottom, top + HEAD + bh + PAD + captionH(zone));
        x += zw + (zgaps[zi] ?? 0);
      }
      for (const { zone } of list) zones.get(zone.id).h = bottom - top;
      bands.set(tier, [top, bottom]);
      top = bottom + Math.max(72, 2 * MARGIN + LANE * ((lanes.get(tier) ?? 0) + 1));
    }
    return { boxes, zones, bands, height: top };
  }

  // Zones in a tier, and boxes in a zone, in the order of where their lines go: the mean position of
  // each line's other end, a line that skips a tier counting as the left corridor. Twice, as each
  // order moves the other.
  for (let pass = 0; pass < 2; pass++) {
    const at = place(new Map()).boxes;
    const other = (id, e) => { const o = e.from === id ? e.to : e.from; return Math.abs(tierOf(o) - tierOf(id)) > 1 ? -width : at.get(o).x + at.get(o).w / 2; };
    const pull = (n) => { const mine = edges.filter((e) => e.from === n.id || e.to === n.id); return mine.length ? mine.reduce((s, e) => s + other(n.id, e), 0) / mine.length : at.get(n.id).x + at.get(n.id).w / 2; };
    const sortBy = (list, key) => { const k = new Map(list.map((x, i) => [x, [key(x), i]])); list.sort((a, b) => k.get(a)[0] - k.get(b)[0] || k.get(a)[1] - k.get(b)[1]); };
    for (const t of tiers) {
      for (const z of t.zones) sortBy(z.members, pull);
      sortBy(t.zones, (z) => z.members.reduce((s, n) => s + pull(n), 0) / z.members.length);
    }
  }
  // A line joining boxes in two zones of one tier brings the zones together and the boxes to their
  // facing ends, so it can join them side to side (once per box: a box has two ends).
  const atEnd = new Set();
  for (const e of edges) {
    if (tierOf(e.from) !== tierOf(e.to) || zoneOf.get(e.from) === zoneOf.get(e.to) || atEnd.has(e.from) || atEnd.has(e.to)) continue;
    const t = tiers[tierOf(e.from) - 1];
    const za = t.zones.find((z) => z.zone === zoneOf.get(e.from)), zb = t.zones.find((z) => z.zone === zoneOf.get(e.to));
    // The right-hand zone of the two stays where the order put it; the other moves beside it.
    const [left, right] = t.zones.indexOf(za) < t.zones.indexOf(zb) ? [za, zb] : [zb, za];
    const [l, r] = left === za ? [e.from, e.to] : [e.to, e.from];
    if ([...left.members.slice(0, -1), ...right.members.slice(1)].some((n) => atEnd.has(n.id))) continue;
    t.zones.splice(t.zones.indexOf(left), 1);
    t.zones.splice(t.zones.indexOf(right), 0, left);
    left.members.push(...left.members.splice(left.members.findIndex((n) => n.id === l), 1));
    right.members.unshift(...right.members.splice(right.members.findIndex((n) => n.id === r), 1));
    atEnd.add(l).add(r);
  }
  measure();
  // Neighbours on one tier with no room between them for their label loop through a gap instead.
  const draft = place(new Map());
  const tight = new Set(edges.filter((e) => {
    if (tierOf(e.from) !== tierOf(e.to)) return false;
    // Neighbours in one zone have room made for their tag (sideGap): never a loop.
    const zone = zoneOf.get(e.from);
    if (zone === zoneOf.get(e.to)) {
      const members = tiers.flatMap((t) => t.zones).find((z) => z.zone === zone).members.map((n) => n.id);
      if (Math.abs(members.indexOf(e.from) - members.indexOf(e.to)) === 1) return false;
    }
    // So do facing boxes of adjacent zones (zoneGaps).
    const list = tiers[tierOf(e.from) - 1].zones;
    if (list.slice(1).some((z, i) => facingEdge(list[i], z) === e)) return false;
    const a = draft.boxes.get(e.from), b = draft.boxes.get(e.to);
    const room = b.x > a.x ? b.x - (a.x + a.w) : a.x - (b.x + b.w);
    const [left, right] = [Math.min(a.x + a.w / 2, b.x + b.w / 2), Math.max(a.x + a.w / 2, b.x + b.w / 2)];
    const between = [...draft.boxes].some(([id, o]) => id !== e.from && id !== e.to && Math.abs(o.y - a.y) < 1 && left < o.x + o.w / 2 && o.x + o.w / 2 < right);
    return between || room < m.width(labelOf(e), LABEL, WEIGHT.regular) + 36;
  }).map((e) => e.id));

  // Plan every line's place in the gaps it crosses (gap n is below tier n).
  const last = tiers.length;
  const end = (box, side, span, x = 0) => ({ box, side, span, x });
  const gaps = new Map(), add = (gap, line) => gaps.set(gap, [...(gaps.get(gap) ?? []), line]);
  // Corridor tracks nest: a line spanning fewer tiers runs inside one spanning more (one that goes on
  // under the bottom tier counts as longer still), so the outer line wraps the inner and neither crosses.
  const skips = edges.filter((e) => Math.abs(tierOf(e.from) - tierOf(e.to)) > 1);
  const reach = (e) => Math.abs(tierOf(e.from) - tierOf(e.to)) + (tierOf(e.to) === last && tierOf(e.to) > tierOf(e.from) ? 0.5 : 0);
  const track = new Map([...skips].sort((a, b) => reach(a) - reach(b) || a.id.localeCompare(b.id)).map((e, i) => [e.id, -CORRIDOR * 2 - CORRIDOR * i]));
  const corridors = skips.length;
  const under = [];
  for (const e of edges) {
    const ta = tierOf(e.from), tb = tierOf(e.to);
    const line = { e, text: labelOf(e) };
    // side: the box edge a leg leaves ("lower" is its bottom); span: the way the leg runs from its lane.
    if (ta === tb && tight.has(e.id)) {
      const [side, span, gap] = ta === last ? ["upper", "down", ta - 1] : ["lower", "up", ta];
      add(gap, { ...line, ends: [end(e.from, side, span), end(e.to, side, span)] });
    } else if (Math.abs(ta - tb) === 1) {
      const down = tb > ta;
      add(Math.min(ta, tb), { ...line, ends: [end(e.from, down ? "lower" : "upper", down ? "up" : "down"), end(e.to, down ? "upper" : "lower", down ? "down" : "up")] });
    } else if (Math.abs(ta - tb) > 1) {
      const xc = track.get(e.id), down = tb > ta;
      const src = end(e.from, down ? "lower" : "upper", down ? "up" : "down"), dst = end(e.to, down ? "upper" : "lower", down ? "down" : "up");
      add(down ? ta : ta - 1, { ...line, ends: [src, end(null, src.side, down ? "down" : "up", xc)], stub: "leave" });
      // Into the bottom tier, it keeps to the corridor, runs under the boxes and rises into its box from below.
      if (down && tb === last) under.push({ ...line, xc });
      else add(down ? tb - 1 : tb, { ...line, ends: [end(null, dst.side, down ? "up" : "down", xc), dst], stub: "enter" });
    }
  }
  const layout = place(new Map([...[...gaps].map(([g, lines]) => [g, lines.length]), [last, under.length]]));
  const { boxes, zones, bands } = layout;
  const cx = (b) => b.x + b.w / 2;

  // Same-tier lines with room run straight between the boxes' sides.
  const routes = new Map(), labels = new Map(), verticals = [];
  const straight = edges.filter((x) => tierOf(x.from) === tierOf(x.to) && !tight.has(x.id));
  for (const e of straight) {
    const a = boxes.get(e.from), b = boxes.get(e.to);
    // Two lines between the same boxes, one each way: the rightward one above the middle, the other
    // below, each half its tag's height away, so the two tags stack instead of overlapping.
    const pair = straight.filter((x) => x !== e && ((x.from === e.from && x.to === e.to) || (x.from === e.to && x.to === e.from)));
    const half = (x) => (labelOf(x) ? sideTag(x).h / 2 : 6) + 3;
    const y = a.y + a.h / 2 + (pair.length ? (b.x > a.x ? -half(e) : half(e)) : 0);
    const [x1, x2] = b.x > a.x ? [a.x + a.w, b.x] : [a.x, b.x + b.w];
    routes.set(e.id, [[x1, y], [x2, y]]);
    if (labelOf(e)) labels.set(e.id, { x: (x1 + x2) / 2, y, text: labelOf(e), side: sideTag(e) });
  }
  const stubs = new Map();
  for (const [gap, lines] of [...gaps].sort(([a], [b]) => a - b)) {
    // Spread the ends on each box side, ordered by where each line's other end is.
    const sides = new Map();
    for (const line of lines) for (const [mine, other] of [[line.ends[0], line.ends[1]], [line.ends[1], line.ends[0]]]) {
      if (!mine.box) continue;
      const key = `${mine.box}|${mine.side}`;
      sides.set(key, [...(sides.get(key) ?? []), [mine, other]]);
    }
    const spread = (where) => {
      for (const [key, list] of sides) {
        const box = boxes.get(key.split("|")[0]);
        list.sort((p, q) => where(p[1]) - where(q[1]) || p[1].box?.localeCompare?.(q[1].box ?? "") || 0);
        list.forEach(([mine], i) => { mine.x = box.x + (box.w * (i + 1)) / (list.length + 1); });
      }
    };
    spread((o) => (o.box ? cx(boxes.get(o.box)) : o.x - 1e6));
    spread((o) => (o.box ? o.x : o.x - 1e6));
    for (const line of lines) { const xs = line.ends.map((x) => x.x); line.lo = Math.min(...xs); line.hi = Math.max(...xs); }
    const order = laneOrder(lines);
    const top = bands.get(gap)[1] + MARGIN, bottom = bands.get(gap + 1)[0] - MARGIN;
    const toLane = (x, y) => (x.box ? (() => { const b = boxes.get(x.box); return [[x.x, x.side === "lower" ? b.y + b.h : b.y], [x.x, y]]; })() : [[x.x, y]]);
    order.forEach((line, i) => {
      line.y = top + ((bottom - top) * (i + 1)) / (order.length + 1);
      const points = [...toLane(line.ends[0], line.y), ...toLane(line.ends[1], line.y).reverse()];
      points.slice(1).forEach((p, j) => { if (p[0] === points[j][0]) verticals.push([p[0], Math.min(p[1], points[j][1]), Math.max(p[1], points[j][1])]); });
      if (line.stub) stubs.set(line.e.id, { ...stubs.get(line.e.id), [line.stub]: points });
      else routes.set(line.e.id, points);
    });
    for (const line of order) if (line.text && line.stub !== "leave") labels.set(line.e.id, { lane: line });
  }
  // The bottom channel: one lane per line below the bottom tier, ends spread along each box's bottom.
  const channelTop = bands.get(last)[1] + MARGIN;
  const byBox = new Map();
  for (const line of under) byBox.set(line.e.to, [...(byBox.get(line.e.to) ?? []), line]);
  for (const [id, list] of byBox) {
    const b = boxes.get(id);
    list.sort((p, q) => p.xc - q.xc).forEach((line, i) => { line.x = b.x + (b.w * (i + 1)) / (list.length + 1); });
  }
  [...under].sort((p, q) => q.xc - p.xc).forEach((line, i) => {
    const b = boxes.get(line.e.to), y = channelTop + LANE * (i + 0.5);
    const leave = stubs.get(line.e.id).leave;
    stubs.delete(line.e.id);
    routes.set(line.e.id, [...leave, [line.xc, y], [line.x, y], [line.x, b.y + b.h]]);
    verticals.push([line.xc, leave.at(-1)[1], y], [line.x, b.y + b.h, y]);
    if (line.text) labels.set(line.e.id, { lane: { text: line.text, y, lo: line.xc, hi: line.x } });
  });
  for (const [id, { leave, enter }] of stubs) {
    routes.set(id, [...leave, ...enter]);
    verticals.push([leave.at(-1)[0], Math.min(leave.at(-1)[1], enter[0][1]), Math.max(leave.at(-1)[1], enter[0][1])]);
  }
  // A lane's tag slides along its run to where no other line passes it; failing that it wraps onto
  // two lines, half as wide, then three, and slides again; failing all it takes the spot fewest lines pass.
  // Tags stay clear of each other and of the lanes beside theirs.
  const horizontals = [...routes].flatMap(([id, pts]) => pts.slice(1).map((p, i) => [id, pts[i], p])).filter(([, a, b]) => a[1] === b[1])
    .map(([id, a, b]) => ({ id, y: a[1], x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]) }));
  const placedTags = [];
  for (const [id, l] of [...labels].sort(([, a], [, b]) => (a.lane ? 1 : 0) - (b.lane ? 1 : 0))) {
    if (!l.lane) { if (l.side) placedTags.push({ x: l.x - l.side.w / 2, y: l.y - l.side.h / 2, w: l.side.w, h: l.side.h }); continue; }
    const y = l.lane.y, mid = (l.lane.lo + l.lane.hi) / 2;
    const own = (vx) => l.lane.lo - 0.5 <= vx && vx <= l.lane.hi + 0.5;
    let best = null;
    for (const tag of [oneLine(l.lane.text), twoLines(l.lane.text), nLines(l.lane.text, 3)]) {
      const half = tag.w / 2;
      // A tag stays out of the corridor unless its own line runs along it.
      const lo = Math.max(l.lane.lo, l.lane.lo < 0 ? half + 4 - CORRIDOR * (corridors + 2) : half + 4), hi = Math.max(lo, l.lane.hi - half);
      for (let x = lo; x <= hi + 0.01; x += 6) {
        const box = { x: x - half, y: y - tag.h / 2, w: tag.w, h: tag.h };
        const lines = verticals.filter(([vx, y0, y1]) => y0 < box.y + box.h && box.y < y1 && box.x - 2 < vx && vx < box.x + box.w + 2 && !(own(vx) && Math.abs(y1 - y) < 0.5 || own(vx) && Math.abs(y0 - y) < 0.5)).length
          + horizontals.filter((h) => h.id !== id && Math.abs(h.y - y) > 0.5 && box.y - 2 < h.y && h.y < box.y + box.h + 2 && h.x0 < box.x + box.w && box.x < h.x1).length;
        const tags = placedTags.filter((o) => o.x < box.x + box.w + 4 && box.x < o.x + o.w + 4 && o.y < box.y + box.h + 2 && box.y < o.y + o.h + 2).length;
        // Fewest lines and tags, then one line before two, then nearest the middle of the run.
        const score = [lines + 10 * tags, tag.lines.length, Math.abs(x - mid)];
        if (!best || score[0] < best.score[0] || (score[0] === best.score[0] && (score[1] < best.score[1] || (score[1] === best.score[1] && score[2] < best.score[2])))) best = { score, x, tag, box };
      }
    }
    placedTags.push(best.box);
    labels.set(id, { x: best.x, y, text: l.lane.text, side: best.tag });
  }

  // Draw: zones, lines, boxes, then step numbers; shift right past the corridors.
  const dx = corridors ? CORRIDOR * (corridors + 2) + 12 : 0, ox = 24 + dx, oy = 24;
  const at = (b) => ({ x: b.x + ox, y: b.y + oy, w: b.w, h: b.h });
  const items = [], headers = [];
  const stepIds = stepsOf(v.steps);
  for (const { zones: list } of tiers) for (const { zone } of list) {
    const z = at(zones.get(zone.id)), text = header(zone), w = headerWidth(zone);
    // The header slides along the zone's top to the first spot no line crosses.
    let hx = z.x + PAD;
    for (let x = z.x + PAD; x <= z.x + z.w - PAD - w; x += 6) {
      if (!verticals.some(([vx, y0, y1]) => y0 + oy < z.y + 26 && z.y + 6 < y1 + oy && x - 10 < vx + ox && vx + ox < x + w + 10)) { hx = x; break; }
    }
    items.push({ id: zone.id, cls: "uxb-group", data: { role: zone.role }, steps: stepIds.get(zone.id), box: { kind: "group", ...z }, shapes: [{ t: "rect", ...z, r: 6, fill: TOKENS.region(1) }] });
    headers.push({ id: null, cls: "uxb-label", data: {}, shapes: [
      { t: "rect", x: hx - 4, y: z.y + 8, w: w + 8, h: 18, r: 3, fill: TOKENS.region(1) },
      { t: "text", x: hx, y: z.y + 21, text, size: HEADER, weight: WEIGHT.bold, tracking: TRACKING, fill: TOKENS.text, on: TOKENS.region(1), w, owner: zone.id },
    ] });
    if (!zone.detail) continue;
    // The caption slides along the zone's bottom from the right to the first spot no line crosses;
    // failing that, along the header's row right of the header; failing both, the bottom spot fewest
    // lines cross (its chip covers them, as a tag's does).
    const cw = captionWidth(zone), crossing = (x, y0) => verticals.filter(([vx, a, b]) => a + oy < y0 + CAPTION_H && y0 < b + oy && x - 10 < vx + ox && vx + ox < x + cw + 10).length;
    const crossed = (x, y0) => crossing(x, y0) > 0;
    const slide = (y0, from) => { for (let x = z.x + z.w - PAD - cw; x >= from; x -= 6) if (!crossed(x, y0)) return x; return null; };
    let y0 = z.y + z.h - CAPTION_H, cxr = slide(y0, z.x + PAD);
    if (cxr === null) { const top = z.y + 6, x = slide(top, hx + w + 24); if (x !== null) [y0, cxr] = [top, x]; }
    if (cxr === null) {
      cxr = z.x + z.w - PAD - cw;
      for (let x = cxr; x >= z.x + PAD; x -= 6) if (crossing(x, y0) < crossing(cxr, y0)) cxr = x;
    }
    headers.push({ id: null, cls: "uxb-label", data: {}, shapes: [
      { t: "rect", x: cxr - 4, y: y0 + 2, w: cw + 8, h: 17, r: 3, fill: TOKENS.region(1) },
      { t: "text", x: cxr, y: y0 + 15, text: zone.detail, size: CAPTION, weight: WEIGHT.regular, fill: TOKENS.text, on: TOKENS.region(1), w: cw, owner: zone.id },
    ] });
  }
  for (const e of edges) {
    const pts = routes.get(e.id);
    if (!pts) continue;
    const l = labels.get(e.id);
    if (l?.side) {
      const t = l.side, cxp = l.x + ox, cyp = l.y + oy;
      const box = { x: cxp - t.w / 2, y: cyp - t.h / 2, w: t.w, h: t.h };
      const item = drawEdge(theme, m, { ...e, label: undefined }, pts.map(([x, y]) => [x + ox, y + oy]), null, { head: TOKENS.accent });
      item.edge.label = box;
      item.shapes.push({ t: "rect", ...box, r: 4, fill: TOKENS.ground },
        ...t.lines.map((line, i) => ({ t: "text", x: cxp, y: box.y + 3 + LABEL + i * m.lineHeight(LABEL), anchor: "middle", text: line, size: LABEL, weight: WEIGHT.regular,
          fill: TOKENS.text, on: TOKENS.ground, w: m.width(line, LABEL, WEIGHT.regular), owner: `${e.id}#label` })));
      items.push({ ...item, steps: stepIds.get(e.id) });
      continue;
    }
    items.push({ ...drawEdge(theme, m, { ...e, label: undefined }, pts.map(([x, y]) => [x + ox, y + oy]), null, { head: TOKENS.accent }), steps: stepIds.get(e.id) });
  }
  // Labels above every line (deploy.py's order): a chip covers the lines it sits on, so its text reads.
  const chipShapes = (it) => it.shapes.filter((x) => x.t === "text" || (x.t === "rect" && x.fill === TOKENS.ground));
  const lineItems = items.filter((it) => it.edge);
  for (const it of lineItems) {
    const chip = chipShapes(it);
    if (!chip.length) continue;
    it.shapes = it.shapes.filter((x) => !chip.includes(x));
    // A tag, as deploy.py draws it: a sunken chip with a hairline border (decoration, not a meaning).
    for (const x of chip) if (x.t === "rect") Object.assign(x, { fill: TOKENS.sunken, stroke: "piq-color-border", sw: 1, r: 4 });
    else x.on = TOKENS.sunken;
    items.push({ id: null, cls: "uxb-label", data: {}, shapes: chip });
  }
  items.push(...headers);
  for (const n of v.nodes) items.push({ ...drawTile(theme, m, n, at(boxes.get(n.id)), nameLines, detailLines), steps: stepIds.get(n.id) });
  const anchors = new Map();
  for (const it of items) if (it.box && it.cls !== "uxb-group") anchors.set(it.id, { x: it.box.x, y: it.box.y }); else if (it.edge?.label) anchors.set(it.id, { x: it.edge.label.x - 14, y: it.edge.label.y + 9, dir: -1 });
  items.push(...badges(v.steps, anchors, m));
  return fit({ width: width + ox + 24, height: layout.height + oy, items });
}

/* Lanes top to bottom in one gap. First, as few crossings as possible: a lane's run crossing a leg of
   a line in a lower lane that rises to a box above, or of a line in a higher lane that drops to a box
   below. Then, among the best: lines leaving one box the same way nest (heading right, the rightmost
   exit on top; heading left, the leftmost), and a loop between neighbours sits in the lane nearest
   its boxes. Every order is tried for a small gap, pruned by the best so far; a large gap takes
   adjacent swaps from the shortest runs up, as deploy.py does. */
function laneOrder(lines) {
  const n = lines.length;
  const crosses = (run, at) => run.lo < at.x && at.x < run.hi;
  const legs = (line, span) => line.ends.filter((x) => x.span === span);
  const cross = (upper, lower) => legs(lower, "up").filter((x) => crosses(upper, x)).length + legs(upper, "down").filter((x) => crosses(lower, x)).length;
  const exit = (line) => line.ends.find((x) => x.box && line.ends.some((o) => o !== x && (o.box !== x.box)));
  const loop = (line) => line.ends.every((x) => x.box) && line.ends[0].side === line.ends[1].side && line.ends[0].span === line.ends[1].span;
  const pref = (upper, lower) => {
    let p = 0;
    const a = upper.ends[0], b = lower.ends[0];
    if (!loop(upper) && !loop(lower) && a.box && a.box === b.box && a.side === b.side) {
      const heading = (line) => Math.sign(line.ends[1].x - line.ends[0].x);
      if (heading(upper) === heading(lower) && heading(upper) !== 0) p += heading(upper) > 0 ? (a.x < b.x ? 1 : 0) : (a.x > b.x ? 1 : 0);
    }
    if (loop(upper) && !loop(lower) && upper.ends[0].span === "down") p += 1;
    if (loop(lower) && !loop(upper) && lower.ends[0].span === "up") p += 1;
    return p;
  };
  const W = 1000;
  const pair = lines.map((u) => lines.map((l) => (u === l ? 0 : cross(u, l) * W + pref(u, l))));
  const tieOrder = [...lines.keys()].sort((i, j) => (lines[i].hi - lines[i].lo) - (lines[j].hi - lines[j].lo) || lines[i].e.id.localeCompare(lines[j].e.id));
  const total = (order) => order.reduce((s, u, i) => s + order.slice(i + 1).reduce((t, l) => t + pair[u][l], 0), 0);
  if (n <= 9) {
    let best = total(tieOrder), bestOrder = tieOrder;
    const used = new Array(n).fill(false), current = [];
    const dfs = (cost) => {
      if (cost >= best) return;
      if (current.length === n) { best = cost; bestOrder = [...current]; return; }
      for (const i of tieOrder) {
        if (used[i]) continue;
        // Placing i next puts it above every line not yet placed.
        let add = 0;
        for (const j of tieOrder) if (!used[j] && j !== i) add += pair[i][j];
        used[i] = true; current.push(i);
        dfs(cost + add);
        current.pop(); used[i] = false;
      }
    };
    dfs(0);
    return bestOrder.map((i) => lines[i]);
  }
  let order = tieOrder, best = total(order), improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      const trial = [...order.slice(0, i), order[i + 1], order[i], ...order.slice(i + 2)], score = total(trial);
      if (score < best) { best = score; order = trial; improved = true; }
    }
  }
  return order.map((i) => lines[i]);
}

/* A deployment box: a tile with its name and detail centred, its role mark in the corner. */
function drawTile(theme, m, node, b, nameLines, detailLines) {
  const p = nodePaint(node);
  const sw = theme.px(p.strong ? "piq-size-diagram-stroke-strong" : "piq-size-diagram-stroke");
  const shapes = [{ t: "rect", x: b.x, y: b.y, w: b.w, h: b.h, r: theme.px("piq-radius-diagram-node"), fill: p.fill, stroke: p.stroke, sw, dash: p.dash, on: TOKENS.ground }];
  if (node.role === "actor" || node.role === "store" || node.role === "document") shapes.push(...roleMark(node.role, b.x + 10, b.y + 9, p.stroke, sw, p.fill, MARK));
  const names = nameLines(node, b.w), details = detailLines(node, b.w);
  const content = names.length * m.lineHeight(NAME) + (details.length ? 2 + details.length * m.lineHeight(DETAIL) : 0);
  let y = b.y + (b.h - content) / 2 + NAME * 0.95;
  for (const line of names) { shapes.push({ t: "text", x: b.x + b.w / 2, y, anchor: "middle", text: line, size: NAME, weight: WEIGHT.bold, fill: p.text, on: p.fill, w: m.width(line, NAME, WEIGHT.bold), owner: node.id }); y += m.lineHeight(NAME); }
  y += 2 - m.lineHeight(NAME) + m.lineHeight(DETAIL);
  for (const line of details) { shapes.push({ t: "text", x: b.x + b.w / 2, y: y - (m.lineHeight(DETAIL) - DETAIL), anchor: "middle", text: line, size: DETAIL, weight: WEIGHT.regular, fill: p.detail, on: p.fill, w: m.width(line, DETAIL, WEIGHT.regular), owner: node.id }); y += m.lineHeight(DETAIL); }
  return { id: node.id, cls: "uxb-node", data: { role: node.role, status: node.status, emphasis: node.emphasis }, box: { kind: "node", ...b }, shapes };
}
