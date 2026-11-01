/* The text equivalent of a visual (visuals PRD §8 Accessibility): what a page places in a
   collapsed block under the figure, as Markdown. */

import { stepMarks } from "./grammar.mjs";
import { formatValue, withUnit } from "./layout/chart.mjs";
import { comparisonTable, markdownTable, metricTable, stackRows, timelineRows } from "./tables.mjs";
import { fieldIndex } from "./layout/structure.mjs";

const md = (s) => String(s).replace(/([\\`*_[\]|])/g, "\\$1");

export function textEquivalent(v) {
  const lines = [`**${md(v.title ?? v.question)}**`, ""];
  if (v.takeaway) lines.push(md(v.takeaway), "");
  const label = new Map([...(v.nodes ?? []), ...(v.sequence?.participants ?? []), ...(v.groups ?? [])].map((x) => [x.id, x.label]));
  const name = (id) => md(label.get(id) ?? id);
  if (v.kind === "structure" && v.form === "stack") lines.push("Layers, top to bottom:", "", markdownTable(["Layer", "Parts"], stackRows(v)));
  else if (v.kind === "flow" || v.kind === "structure") {
    const groupOf = new Map((v.groups ?? []).map((g) => [g.id, g.label]));
    lines.push("Parts:", "");
    for (const n of v.nodes) lines.push(`- ${md(n.label)}${n.detail ? ` (${md(n.detail)})` : ""}${n.group ? `, in ${md(groupOf.get(n.group))}` : ""}${n.parent ? `, part of ${name(n.parent)}` : ""}`);
    if (v.edges?.length) {
      lines.push("", "Connections:", "");
      for (const e of v.edges) lines.push(`- ${name(e.from)} → ${name(e.to)}${e.label ? `: ${md(e.label)}` : ""}`);
    }
    if (v.structure?.references?.length) {
      lines.push("", "References:", "");
      // Counts in words: a cardinality, or an exact multiplicity in its own notation (umf.visual 1.1.0).
      const fieldsOf = new Map((v.structure.entities ?? []).map((e) => [e.node, e.fields]));
      const count = (card, mult) => card ? card.replaceAll("-", " ") : mult ? (mult.text ?? `${mult.min}..${mult.max ?? "*"}`) : null;
      for (const r of v.structure.references) {
        const field = (fieldsOf.get(r.to.node) ?? [])[fieldIndex(fieldsOf.get(r.to.node), r.to)]?.name;
        const from = count(r.fromCardinality, r.fromMultiplicity), to = count(r.toCardinality, r.toMultiplicity);
        // Only where an exact multiplicity is stated, so a 1.0.0 document reads as it always has.
        const counts = r.fromMultiplicity || r.toMultiplicity ? ` (${from ?? "unstated"} to ${to ?? "unstated"})` : "";
        lines.push(`- ${name(r.from.node)} → ${name(r.to.node)}${field ? `.${md(field)}` : ""}${r.label ? `: ${md(r.label)}` : ""}${counts}`);
      }
    }
  }
  if (v.kind === "timeline") {
    lines.push("In order:", "");
    for (const r of timelineRows(v)) lines.push(`- ${md(r.when)}: ${md(r.what)}${r.lane ? ` (${md(r.lane)})` : ""}${r.status && r.status !== "built" ? `, ${md(r.status)}` : ""}`);
  }
  if (v.kind === "comparison") lines.push(comparisonTable(v));
  if (v.kind === "metric") {
    const mt = v.metric, pts = mt.series[0].points, now = pts.at(-1).value;
    if (v.form === "stat") lines.push(`Now: ${withUnit(now, mt)}${pts.length > 1 ? ` (${now >= pts.at(-2).value ? "up" : "down"} from ${formatValue(pts.at(-2).value, mt.format)})` : ""}.`, "");
    if (v.form === "meter") lines.push(`${withUnit(now, mt)} of ${formatValue(mt.target ?? 100, mt.format)} (${Math.round((now / (mt.target ?? 100)) * 100)}%).`, "");
    lines.push(metricTable(v));
  }
  if (v.kind === "sequence") {
    lines.push("Steps:", "");
    v.sequence.messages.forEach((msg, i) => lines.push(`${i + 1}. ${name(msg.from)} → ${name(msg.to)}: ${md(msg.label)}`));
  }
  if (v.kind === "state") {
    lines.push(`States: ${v.nodes.map((n) => md(n.label)).join(", ")}. Starts in ${name(v.state.initial)}.`, "", "Transitions:", "");
    for (const t of v.state.transitions) lines.push(`- ${name(t.from)} → ${name(t.to)}: ${md(t.event)}${t.guard ? ` [${md(t.guard)}]` : ""}${t.action ? ` / ${md(t.action)}` : ""}`);
  }
  if (v.steps?.length) {
    lines.push("", "Walkthrough:", "");
    // Numbered steps in order, then each step outside the sequence led by when it happens.
    const marks = stepMarks(v.steps), say = (s) => `${md(s.title)}${s.caption ? `: ${md(s.caption)}` : ""}`;
    for (const s of v.steps) if (!s.when) lines.push(`${marks.get(s.id).number}. ${say(s)}`);
    const aside = v.steps.filter((s) => s.when);
    if (aside.length) lines.push("", ...aside.map((s) => `${md(marks.get(s.id).lead)}: ${say(s)}`));
  }
  if (v.omissions?.length) lines.push("", `Not shown: ${v.omissions.map(md).join(" ")}`);
  return lines.join("\n") + "\n";
}
