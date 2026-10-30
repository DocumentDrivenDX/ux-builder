/* The portable form (visuals PRD §6.4, CONTRACT-009): Mermaid for readers of Markdown, opened
   with the theme's colours and the visual's id, so a page's record still shows the picture. The
   SVG stays authoritative; Mermaid's layout is approximate. */

import { TOKENS } from "../grammar.mjs";
import { comparisonTable, markdownTable, metricTable, stackRows, timelineRows } from "../tables.mjs";

/* Mermaid ids: letters, digits and underscores, never a keyword, one per document id ("_" is "__", "-" is "_h"). */
const safe = (id) => String(id).replace(/_/g, "__").replace(/-/g, "_h");
const mid = (id) => `v_${safe(id)}`;
/* Document text inside a quoted label: Mermaid's entity codes for markup and quotes, so a label never becomes HTML. */
const esc = (s) => String(s).replace(/&/g, "#amp;").replace(/</g, "#lt;").replace(/>/g, "#gt;").replace(/"/g, "#quot;").replace(/\r?\n/g, "<br/>");
const quote = (s) => `"${esc(s)}"`;
/* Text after a colon (messages, transitions): no colons or semicolons, which end the statement. */
const plain = (s) => String(s).replace(/[;:\r\n]+/g, " ").replace(/#/g, "#35;").trim();

function init(theme) {
  const c = (t) => theme.hex(t, theme.appearance === "both" ? "light" : undefined);
  const vars = {
    background: c(TOKENS.ground), primaryColor: c(TOKENS.surface), primaryTextColor: c(TOKENS.strong), primaryBorderColor: c(TOKENS.edgeMuted),
    secondaryColor: c(TOKENS.sunken), tertiaryColor: c(TOKENS.region(1)), lineColor: c(TOKENS.edge), textColor: c(TOKENS.text),
    clusterBkg: c(TOKENS.region(1)), clusterBorder: c(TOKENS.region(1)), edgeLabelBackground: c(TOKENS.ground),
    actorBkg: c(TOKENS.surface), actorBorder: c(TOKENS.edgeMuted), actorTextColor: c(TOKENS.strong), actorLineColor: c(TOKENS.edgeMuted),
    signalColor: c(TOKENS.edgeStrong), signalTextColor: c(TOKENS.text), noteBkgColor: c(TOKENS.sunken), noteTextColor: c(TOKENS.text), noteBorderColor: c(TOKENS.edgeMuted),
    fontFamily: theme.font,
  };
  return `%%{init: ${JSON.stringify({ theme: "base", themeVariables: vars })}}%%`;
}

function classDefs(theme) {
  const c = (t) => theme.hex(t, theme.appearance === "both" ? "light" : undefined);
  return [
    `classDef own stroke:${c(TOKENS.accent)},stroke-width:2px`,
    `classDef external fill:${c(TOKENS.sunken)}`,
    `classDef placeholder fill:${c(TOKENS.placeholder)}`,
    `classDef decided fill:${c(TOKENS.decided)},stroke-dasharray:6 4`,
    `classDef unknown fill:${c(TOKENS.unknown)},stroke-dasharray:2 3,color:${c(TOKENS.text)}`,
  ];
}

const classesOf = (n) => [n.role === "own" && "own", (n.role === "external" || n.role === "platform") && "external", ["placeholder", "decided", "unknown"].includes(n.status) && n.status].filter(Boolean);

function nodeText(n) {
  const q = `"${esc(n.label)}${n.detail ? `<br/><small>${esc(n.detail)}</small>` : ""}"`;
  if (n.role === "store") return `${mid(n.id)}[(${q})]`;
  if (n.role === "actor") return `${mid(n.id)}([${q}])`;
  return `${mid(n.id)}[${q}]`;
}

function flowchart(v, theme, direction) {
  const out = [`flowchart ${direction}`];
  const groups = v.groups ?? [];
  const write = (parent, indent) => {
    for (const g of groups.filter((x) => (x.parent ?? null) === parent)) {
      out.push(`${indent}subgraph ${mid(g.id)}[${quote(g.label)}]`);
      write(g.id, indent + "  ");
      out.push(`${indent}end`);
    }
    for (const n of v.nodes.filter((x) => (x.group ?? null) === parent)) out.push(`${indent}${nodeText(n)}`);
  };
  write(null, "  ");
  const arrow = { action: "==>", control: "-.->", return: "-.->" };
  for (const e of v.edges ?? []) out.push(`  ${mid(e.from)} ${arrow[e.kind] ?? "-->"}${e.label ? `|${quote(e.label)}|` : ""} ${mid(e.to)}`);
  if (v.kind === "structure") for (const n of v.nodes.filter((x) => x.parent)) out.push(`  ${mid(n.parent)} --- ${mid(n.id)}`);
  out.push(...classDefs(theme).map((d) => `  ${d}`));
  for (const n of v.nodes) for (const cls of classesOf(n)) out.push(`  class ${mid(n.id)} ${cls}`);
  return out;
}

function sequence(v, theme) {
  const { participants, messages } = v.sequence;
  const out = ["sequenceDiagram"];
  for (const p of participants) out.push(`  participant ${mid(p.id)} as ${plain(p.label)}`);
  const groups = new Map((v.groups ?? []).map((g) => [g.id, g]));
  const chain = (id) => { const out = []; for (let g = groups.get(id); g; g = groups.get(g.parent)) out.unshift(g); return out; };
  const arrow = { call: "->>", return: "-->>", async: "-)" };
  const tint = theme.hex(TOKENS.region(1), theme.appearance === "both" ? "light" : undefined);
  const rgb = `rgb(${[1, 3, 5].map((i) => parseInt(tint.slice(i, i + 2), 16)).join(", ")})`;
  const span = `${mid(participants[0].id)},${mid(participants.at(-1).id)}`;
  // Open and close blocks as each message's group path changes: loop, alt, or a tinted phase named by a note.
  let open = [];
  for (const msg of messages) {
    const path = msg.group ? chain(msg.group) : [];
    let keep = 0;
    while (keep < open.length && open[keep] === path[keep]) keep++;
    for (let i = open.length - 1; i >= keep; i--) out.push(`${"  ".repeat(i + 1)}end`);
    for (let i = keep; i < path.length; i++) {
      const g = path[i], ind = "  ".repeat(i + 1);
      if (g.role === "loop") out.push(`${ind}loop ${plain(g.label)}`);
      else if (g.role === "alternative") out.push(`${ind}alt ${plain(g.label)}`);
      else out.push(`${ind}rect ${rgb}`, `${ind}  Note over ${span}: ${plain(g.label)}`);
    }
    open = path;
    const ind = "  ".repeat(open.length + 1);
    if (msg.kind === "note") out.push(`${ind}Note over ${mid(msg.from)}${msg.to !== msg.from ? `,${mid(msg.to)}` : ""}: ${plain(msg.label)}`);
    else out.push(`${ind}${mid(msg.from)}${arrow[msg.kind] ?? "->>"}${mid(msg.to)}: ${plain(msg.label)}`);
  }
  for (let i = open.length - 1; i >= 0; i--) out.push(`${"  ".repeat(i + 1)}end`);
  return out;
}

function state(v) {
  const out = ["stateDiagram-v2"];
  const write = (parent, indent) => {
    for (const n of v.nodes.filter((x) => (x.parent ?? null) === parent)) {
      const kids = v.nodes.some((x) => x.parent === n.id);
      out.push(`${indent}state ${quote(n.label)} as ${mid(n.id)}${kids ? " {" : ""}`);
      if (kids) { write(n.id, indent + "  "); out.push(`${indent}}`); }
    }
  };
  write(null, "  ");
  out.push(`  [*] --> ${mid(v.state.initial)}`);
  for (const t of v.state.transitions) out.push(`  ${mid(t.from)} --> ${mid(t.to)}: ${plain(`${t.event}${t.guard ? ` [${t.guard}]` : ""}${t.action ? ` / ${t.action}` : ""}`)}`);
  for (const f of v.state.final ?? []) out.push(`  ${mid(f)} --> [*]`);
  return out;
}

const LEFT = { "exactly-one": "||", "zero-or-one": "|o", "zero-or-many": "}o", "one-or-many": "}|" };
const RIGHT = { "exactly-one": "||", "zero-or-one": "o|", "zero-or-many": "o{", "one-or-many": "|{" };

function entities(v) {
  const out = ["erDiagram"];
  const fields = new Map((v.structure.entities ?? []).map((e) => [e.node, e.fields]));
  const ename = (id) => safe(id);
  for (const n of v.nodes) {
    const list = fields.get(n.id) ?? [];
    if (!list.length) { out.push(`  ${ename(n.id)}`); continue; }
    out.push(`  ${ename(n.id)} {`);
    for (const f of list) {
      const keys = (f.keys ?? []).map((k) => k.toUpperCase()).join(",");
      out.push(`    ${String(f.type ?? "value").replace(/[^A-Za-z0-9_]/g, "_")} ${String(f.name).replace(/[^A-Za-z0-9_]/g, "_")}${keys ? ` ${keys}` : ""}`);
    }
    out.push("  }");
  }
  for (const r of v.structure.references ?? []) out.push(`  ${ename(r.from.node)} ${LEFT[r.fromCardinality] ?? "||"}--${RIGHT[r.toCardinality] ?? "o{"} ${ename(r.to.node)} : ${quote(r.label ?? r.to.field ?? "references")}`);
  return out;
}

/* A timeline (milestones, history, or a roadmap on named periods): one line per time, its events after colons. */
function timeline(v) {
  const out = ["timeline", `  title ${plain(v.title ?? v.question)}`];
  const rows = timelineRows(v);
  const byWhen = new Map();
  for (const r of rows) byWhen.set(r.when, [...(byWhen.get(r.when) ?? []), `${r.what}${r.lane && v.form === "roadmap" ? ` (${r.lane})` : ""}`]);
  for (const [when, whats] of byWhen) out.push(`  ${plain(when)} : ${whats.map(plain).join(" : ")}`);
  return out;
}

/* A roadmap on dates: a gantt, a section per lane, built spans done. */
function gantt(v) {
  const t = v.timeline, out = ["gantt", `  title ${plain(v.title ?? v.question)}`, "  dateFormat YYYY-MM-DD"];
  const lanes = t.lanes?.length ? t.lanes : [{ id: undefined, label: "Work" }];
  for (const lane of lanes) {
    const spans = (t.spans ?? []).filter((x) => x.lane === lane.id);
    if (!spans.length) continue;
    out.push(`  section ${plain(lane.label)}`);
    for (const x of spans) out.push(`    ${plain(x.label)} :${x.status === "built" ? "done, " : ""}${safe(x.id)}, ${x.start}, ${x.end}`);
  }
  for (const k of t.markers ?? []) out.push(`  ${plain(k.label)} :milestone, ${safe(k.id)}, ${k.at}, 0d`);
  return out;
}

/** The portable form of a kind Mermaid has no diagram for (visuals PRD §6.4): a Markdown table. */
function table(v) {
  const title = `**${v.title ?? v.question}**`;
  if (v.kind === "comparison") return `${title}\n\n${comparisonTable(v)}\n`;
  if (v.kind === "metric") return `${title}\n\n${metricTable(v)}\n`;
  if (v.form === "stack") return `${title}\n\n${markdownTable(["Layer", "Parts"], stackRows(v))}\n`;
  const label = new Map(v.nodes.map((n) => [n.id, n.label]));
  return `${title}\n\n${markdownTable(["Part", "Inside"], v.nodes.map((n) => [n.label, n.parent ? label.get(n.parent) : ""]))}\n`;
}

/** Whether a visual's portable form is a Markdown table rather than Mermaid. */
export const portableIsTable = (v) => v.kind === "comparison" || v.kind === "metric" || (v.kind === "structure" && (v.form === "stack" || v.form === "nested"));

/** The Mermaid text of a visual in a theme, or a Markdown table where Mermaid has no diagram for it. */
export function emitMermaid(v, theme) {
  if (portableIsTable(v)) return table(v);
  let body;
  if (v.kind === "flow") body = flowchart(v, theme, v.form === "zoned" ? "TB" : "LR");
  else if (v.kind === "structure" && v.form === "tree") body = flowchart(v, theme, "TD");
  else if (v.kind === "structure") body = entities(v);
  else if (v.kind === "sequence") body = sequence(v, theme);
  else if (v.kind === "state") body = state(v);
  else if (v.kind === "timeline") body = v.form === "roadmap" && v.timeline.scale.kind !== "period" ? gantt(v) : timeline(v);
  return [init(theme), `%% id: ${v.id}`, ...body].join("\n") + "\n";
}
