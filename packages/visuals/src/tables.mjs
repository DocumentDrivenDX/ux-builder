/* The rows behind the remaining kinds (FR-95): what the text equivalent shows, and what the
   portable form is when Mermaid has no diagram for the kind (visuals PRD §6.4: a Markdown table). */

import { valueWords } from "./layout/comparison.mjs";
import { dateLabel, day, formatValue, withUnit } from "./layout/chart.mjs";

const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
export const markdownTable = (head, rows) => [`| ${head.map(cell).join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");

/** A comparison as criteria by items; a changed row marked for before-after; the choice beneath. */
export function comparisonTable(v) {
  const c = v.comparison;
  const value = (it, cr) => c.values.find((x) => x.item === it && x.criterion === cr);
  const head = ["", ...c.items.map((it) => (it.id === c.chosen?.item ? `${it.label} (chosen)` : it.label))];
  if (v.form === "before-after") head.push("Changed");
  const rows = c.criteria.map((cr) => {
    const cells = c.items.map((it) => valueWords(cr, value(it.id, cr.id)));
    return [cr.label, ...cells, ...(v.form === "before-after" ? [cells[0] === cells[1] ? "No" : "Yes"] : [])];
  });
  const out = [markdownTable(head, rows)];
  if (c.chosen) out.push("", `Chosen: ${c.items.find((it) => it.id === c.chosen.item)?.label ?? c.chosen.item}, because ${c.chosen.reason}`);
  return out.join("\n");
}

/** A metric's values: categories or dates down the side, a column per series, each with its unit. */
export function metricTable(v) {
  const mt = v.metric, cats = mt.axis?.categories;
  const ats = cats ? cats.map((c) => c.id) : [...new Set(mt.series.flatMap((s) => s.points.map((p) => p.at ?? "now")))];
  const name = (at) => cats?.find((c) => c.id === at)?.label ?? (/^\d{4}-\d{2}-\d{2}/.test(at) ? dateLabel(day(at)) : at);
  const rows = ats.map((at) => [name(at), ...mt.series.map((s) => { const p = s.points.find((q) => (q.at ?? "now") === at); return p ? withUnit(p.value, mt) : "—"; })]);
  const out = [markdownTable([mt.axis?.kind === "time" || ats.some((a) => /^\d{4}-/.test(a)) ? "Date" : "", ...mt.series.map((s) => s.label)], rows)];
  if (mt.target !== undefined) out.push("", `Target: ${withUnit(mt.target, mt)}`);
  if (mt.good) out.push("", `Better is ${mt.good}.`);
  return out.join("\n");
}

/** A timeline's entries in order: when, what, and its lane. */
export function timelineRows(v) {
  const t = v.timeline;
  const periods = t.scale.kind === "period" ? new Map(t.scale.periods.map((p, i) => [p.id, { i, label: p.label }])) : null;
  const when = (x) => (periods ? periods.get(x)?.label ?? x : dateLabel(day(x)));
  const order = (x) => (periods ? periods.get(x)?.i ?? 0 : day(x));
  const lane = (id) => t.lanes?.find((l) => l.id === id)?.label;
  const rows = [
    ...(t.events ?? []).map((e) => ({ o: order(e.at), when: when(e.at), what: e.label, lane: lane(e.lane), status: e.status })),
    ...(t.spans ?? []).map((s) => ({ o: order(s.start), when: s.start === s.end ? when(s.start) : `${when(s.start)} to ${when(s.end)}`, what: s.label, lane: lane(s.lane), status: s.status })),
    ...(t.markers ?? []).map((k) => ({ o: order(k.at), when: when(k.at), what: `${k.label} (${k.kind})` })),
  ];
  return rows.sort((a, b) => a.o - b.o);
}

/** A stack's parts by layer. */
export function stackRows(v) {
  const layers = v.structure?.layers ?? [];
  const known = new Set(layers.map((l) => l.id));
  const rows = layers.map((l) => [l.label, v.nodes.filter((n) => n.layer === l.id).map((n) => n.label).join(", ")]);
  const other = v.nodes.filter((n) => !known.has(n.layer));
  if (other.length) rows.push(["Other", other.map((n) => n.label).join(", ")]);
  return rows.filter((r) => r[1]);
}

export { formatValue };
