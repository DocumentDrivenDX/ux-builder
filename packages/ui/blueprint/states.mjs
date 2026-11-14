/* Each screen's interaction states: the states it declares, the transitions
   between them and, per state, what the user sees, the action available and
   the announcement (FEAT-015 RPT-09; US-104; ADR-030; CONTRACT-005 Flows
   and journeys). Internal to @ux-builder/ui/blueprint: draw.mjs, wireframes.mjs
   and propose.mjs use it.

     import { stateModels } from "./states.mjs";
     stateModels(blueprint); // [{ screen, title, pattern, states, transitions, rows, notes }]

   A pure function of the blueprint, in blueprint order, so the drawings and
   drafts made from it are deterministic. The states are ideal (always) and
   those the screen declares (screens[].states), with any a `state:` action or
   a journey step names. The transitions come from the blueprint first:
   - an action whose `to` is `state:<state>`, from the state a journey step
     takes it in, else from ideal (a retry into loading: from error and
     partial, where the SDK offers it);
   - a journey step's `expect` after such an action;
   and then the SDK's defaults, each named in the model's notes: the screen
   opens loading (else ideal), loading settles into ideal, empty, partial,
   error, forbidden or not-found, error and partial retry into loading, and
   no-results clears its filters back to ideal. An action that leaves the
   screen (another screen, a modal, back, out of the app) is an exit, from
   each state it is available in. What the user sees and the announcement
   are the SDK's own (StatePanel's copy and live-region role, Skeleton's
   aria-busy); the blueprint has no field for them. */

import { screensOf, walkJourney } from "./project.mjs";

const list = (x) => (Array.isArray(x) ? x.filter((y) => y && typeof y === "object") : []);
/* The UI stack's order (ideal, loading, empty, partial, error), then the rest. */
const ORDER = ["ideal", "loading", "empty", "partial", "error", "no-results", "forbidden", "not-found"];
/* The states every data screen is asked to declare (screen.states, view.states). */
export const EXPECTED = ["empty", "loading", "error"];
const LOADING = new Set(["CollectionList", "RecordDetail", "ReportViewer", "ChartFrame"]);
const canonical = (s) => (s === "ready" ? "ideal" : String(s));

/* StatePanel's copy (src/patterns/Regions.jsx) and its live-region role. */
const PANEL = {
  empty: { title: "Nothing here yet", text: "When there is something to show, it will be listed here.", role: "status" },
  "no-results": { title: "No results match", text: "Try different words, or remove a filter.", role: "status" },
  forbidden: { title: "You don't have access to this", text: "Ask the person who manages this workspace to give you access.", role: "status" },
  error: { title: "This didn't load", text: "Something went wrong on our side. Try again.", role: "alert" },
  partial: { title: "Some of this didn't load", text: "What loaded is shown below. Try again for the rest.", role: "status" },
  "not-found": { title: "This record no longer exists", text: "It may have been deleted or moved.", role: "status" },
};
const EMPTY = {
  WorkQueue: ["Nothing to review", "New items will appear here."],
  RecordDetail: ["Choose a record", "Select a record in the list to see it here."],
  ChartFrame: ["No data for this period", "Try a different date range or filters."],
};

/* The default event (and guard) between two states. */
const DEFAULTS = [
  ["loading", "ideal", "LOADED", "items"],
  ["loading", "empty", "LOADED", "no items"],
  ["loading", "partial", "LOADED", "some failed"],
  ["loading", "error", "FAILED", null],
  ["loading", "forbidden", "DENIED", null],
  ["loading", "not-found", "NOT_FOUND", null],
  ["error", "loading", "RETRY", null],
  ["partial", "loading", "RETRY", null],
  ["ideal", "no-results", "FILTERED", "no match"],
  ["no-results", "ideal", "CLEAR_FILTERS", null],
];

/* A Mermaid- and SVG-safe state ID. */
export const stateId = (s) => s.replace(/[^A-Za-z0-9_]/g, "_");

/* What an action does when it leaves the screen, in words. */
function leads(a, screens, owner) {
  const to = typeof a.to === "string" ? a.to : null;
  if (!to) return null;
  if (to === "back") return "back";
  if (to === "external") return "out of the app";
  if (to.startsWith("modal:")) { const m = owner.modals.get(to.slice(6)); return `opens ${m?.title || to.slice(6)}`; }
  if (to.startsWith("state:")) return null;
  return screens.has(to) ? `to ${screens.get(to).s.title ?? to}` : null;
}

/* The state model of one screen. */
function model(id, { s, modals }, screens, journeys) {
  const title = s.title ?? id;
  const declared = [...new Set((Array.isArray(s.states) ? s.states : []).filter((x) => typeof x === "string").map(canonical))];
  const seen = ["ideal", ...declared.filter((x) => x !== "ideal")];
  const referenced = new Map(); // state -> where it is named
  const name = (st, where) => { st = canonical(st); if (!seen.includes(st) && !referenced.has(st)) referenced.set(st, where); };
  const own = [...list(s.actions).map((a) => ({ a, modal: null })), ...[...modals.values()].flatMap((m) => list(m.actions).map((a) => ({ a, modal: m })))];
  for (const { a } of own) if (typeof a.to === "string" && a.to.startsWith("state:")) name(a.to.slice(6), `"${a.label ?? a.id}" leads to it`);

  // The journey steps on this screen (its modals included).
  const steps = [];
  for (const j of journeys) {
    const { main, alternates } = walkJourney(j, screens);
    const walks = [{ label: j.id, ws: main }, ...alternates.map((x, i) => ({ label: `${j.id} alternate ${i + 1}`, ws: x.steps }))];
    for (const { label, ws } of walks) ws.forEach((w, k) => {
      if (w.node?.screen !== id) return;
      const at = `${label} step ${k + 1}`;
      if (typeof w.st.state === "string") name(w.st.state, at);
      if (typeof w.st.expect === "string") name(w.st.expect, at);
      steps.push({ w, at, prev: k > 0 ? ws[k - 1] : null });
    });
  }
  const rank = (st) => (ORDER.includes(st) ? ORDER.indexOf(st) : ORDER.length);
  const states = [...seen, ...referenced.keys()].sort((a, b) => rank(a) - rank(b)); // stable: the rest keep their order
  const has = (st) => states.includes(st);

  // Transitions: { from, to, event, guard, source, via }; from "[*]" is the start, to "[*]" leaves the screen.
  const transitions = [];
  const edge = (t) => { if (!transitions.some((x) => x.from === t.from && x.to === t.to && x.event === t.event)) transitions.push(t); };
  const linked = (from, to) => transitions.some((x) => x.from === from && x.to === to);
  const entered = new Map(states.map((st) => [st, []]));
  const available = new Map(states.map((st) => [st, []]));
  const offer = (st, label) => { const l = available.get(st); if (l && !l.includes(label)) l.push(label); };
  const takenIn = new Map(); // action -> states a journey takes it in

  for (const { w, at, prev } of steps) {
    const from = canonical(w.st.state ?? "ideal");
    if (w.action) {
      const label = w.action.label ?? w.action.id;
      if (!takenIn.has(w.action)) takenIn.set(w.action, new Set());
      takenIn.get(w.action).add(from);
      offer(from, label);
      if (w.to?.kind === "state") {
        const to = canonical(w.to.state);
        edge({ from, to, event: label, guard: null, source: "journey", via: at });
        if (typeof w.st.expect === "string" && canonical(w.st.expect) !== to) {
          const d = DEFAULTS.find(([f, t]) => f === to && t === canonical(w.st.expect));
          edge({ from: to, to: canonical(w.st.expect), event: d?.[2] ?? "SETTLED", guard: d?.[3] ?? null, source: "journey", via: at });
        }
      }
    }
    if (typeof w.st.expect === "string" && w.to?.kind !== "state") {
      const arrived = prev?.node && prev.node.screen !== id && prev.action;
      entered.get(canonical(w.st.expect))?.push(arrived ? `${at}: after "${prev.action.label ?? prev.action.id}" on ${screens.get(prev.node.screen)?.s.title ?? prev.node.screen}` : at);
    }
  }
  const notes = [];
  for (const { a, modal } of own) {
    if (typeof a.to !== "string" || !a.to.startsWith("state:")) continue;
    const label = a.label ?? a.id;
    const to = canonical(a.to.slice(6));
    if (takenIn.has(a)) continue;
    const retry = to === "loading" && (has("error") || has("partial"));
    const froms = retry ? ["error", "partial"].filter(has) : ["ideal"];
    for (const from of froms) { edge({ from, to, event: label, guard: null, source: "action", via: modal ? `in ${modal.title || modal.id}` : null }); offer(from, label); }
    if (retry) notes.push(`"${label}" (state:loading) is drawn from ${froms.join(" and ")}, where a retry is offered; no journey step takes it.`);
  }

  // The SDK's defaults, where the blueprint says nothing between the two states.
  const defaults = [];
  const start = has("loading") ? ["loading"] : states.filter((st) => ["ideal", "empty", "partial", "error", "forbidden", "not-found"].includes(st));
  for (const st of start) {
    const d = has("loading") ? null : DEFAULTS.find(([f, t]) => f === "loading" && t === st);
    const t = { from: "[*]", to: st, event: has("loading") ? "OPENED" : st === "ideal" ? "OPENED" : d[2], guard: start.length > 1 ? d?.[3] ?? null : null, source: "default", via: null };
    edge(t); defaults.push(t);
  }
  for (const [from, to, event, guard] of DEFAULTS) {
    if (!has(from) || !has(to) || linked(from, to)) continue;
    const t = { from, to, event, guard, source: "default", via: null };
    edge(t); defaults.push(t);
  }
  if (defaults.length) notes.push(`Default transitions (the SDK's, not in the blueprint): ${defaults.map((t) => `${t.from === "[*]" ? "start" : t.from} → ${t.to} on ${t.event}${t.guard ? ` [${t.guard}]` : ""}`).join("; ")}.`);

  // What each state offers: ideal every action; empty its primary action; error and partial a retry; all of them back.
  const actions = own.filter(({ modal }) => !modal).map(({ a }) => a);
  const backs = actions.filter((a) => a.to === "back").map((a) => a.label ?? a.id);
  const retryLabel = actions.find((a) => a.to === "state:loading")?.label ?? "Try again";
  for (const st of states) {
    const leaving = actions.filter((a) => typeof a.to !== "string" || !a.to.startsWith("state:")).map((a) => a.label ?? a.id);
    const pick = st === "ideal" || !ORDER.includes(st) ? leaving
      : st === "loading" ? []
        // A record's empty state is "choose a record": nothing to act on but back.
        : st === "empty" ? [...(s.pattern === "RecordDetail" ? [] : actions.filter((a) => a.primary).map((a) => a.label ?? a.id)), ...backs]
          : st === "error" || st === "partial" ? [retryLabel, ...(st === "partial" ? leaving : backs)]
            : st === "no-results" ? ["Clear filters", ...backs] : backs;
    for (const l of pick) offer(st, l);
  }
  // Exits: an available action that leaves the screen.
  for (const st of states) for (const l of available.get(st)) {
    const a = actions.find((x) => (x.label ?? x.id) === l);
    const where = a && leads(a, screens, { modals });
    if (where) edge({ from: st, to: "[*]", event: l, guard: null, source: "exit", via: where });
  }

  const place = (t) => (t.from === "[*]" ? 0 : t.to === "[*]" ? 2 : 1);
  transitions.sort((a, b) => place(a) - place(b)); // stable
  const rows = states.map((st) => ({
    state: st,
    entered: [...transitions.filter((t) => t.to === st).map((t) => (t.from === "[*]" ? `the screen opens${t.event !== "OPENED" ? ` (${t.event}${t.guard ? ` [${t.guard}]` : ""})` : ""}` : `${t.event}${t.guard ? ` [${t.guard}]` : ""} from ${t.from}`)), ...entered.get(st)],
    sees: sees(st, s),
    actions: available.get(st),
    announcement: announcement(st, s),
    exits: transitions.filter((t) => t.from === st).map((t) => (t.to === "[*]" ? `${t.event} (${t.via})` : `${t.event} → ${t.to}`)),
  }));

  const missing = EXPECTED.filter((x) => !declared.includes(x));
  if (!declared.length) notes.unshift(`"${title}" declares no states: the diagram has the ideal state only. Missing: ${missing.join(", ")}. Add them to screens[].states, or say why they cannot occur.`);
  else if (missing.length) notes.unshift(`"${title}" does not declare ${missing.join(", ")}. Add ${missing.length > 1 ? "them" : "it"} to screens[].states, or say why ${missing.length > 1 ? "they" : "it"} cannot occur.`);
  for (const [st, where] of referenced) notes.push(`${st} is not declared, but ${where}.`);
  return { screen: id, title, pattern: s.pattern ?? null, declared, missing, states, transitions, rows, notes };
}

/* What the user sees in a state, from the pattern's own rendering of it. */
function sees(st, s) {
  const title = s.title ?? s.id;
  const primary = list(s.actions).find((a) => a.primary);
  if (st === "ideal") return `${title}: the ${s.pattern ?? "screen"} with its content`;
  if (st === "loading") return LOADING.has(s.pattern) ? "Skeleton placeholders where the content goes" : "A loading placeholder where the content goes";
  const p = PANEL[st];
  if (!p) return `${title} in its ${st} state`;
  const [head, text] = st === "empty" && EMPTY[s.pattern] ? EMPTY[s.pattern] : [p.title, p.text];
  const button = st === "empty" && primary && s.pattern !== "RecordDetail" ? primary.label ?? primary.id : st === "error" || st === "partial" ? "Try again" : st === "no-results" ? "Clear filters" : null;
  return `"${head}" — ${text}${st === "no-results" ? " The active filters are listed." : ""}${button ? ` Button: ${button}.` : ""}`;
}

/* The announcement: the live-region text and its politeness. */
function announcement(st, s) {
  if (st === "ideal") return "None: the content replaces the busy region; the page heading names the screen";
  if (st === "loading") return `aria-busy="true" on the region while it loads (polite)`;
  const p = PANEL[st];
  if (!p) return `"${s.title ?? s.id}: ${st}" (polite)`;
  const head = st === "empty" && EMPTY[s.pattern] ? EMPTY[s.pattern][0] : p.title;
  return `"${head}" (${p.role === "alert" ? "assertive" : "polite"}, role="${p.role}")`;
}

/* The state model of every screen, in blueprint order. */
export function stateModels(bp) {
  const screens = screensOf(bp);
  const journeys = list(bp?.journeys).filter((j) => typeof j.id === "string");
  return [...screens].map(([id, sc]) => model(id, sc, screens, journeys));
}

/* ----------------------------------------------------------- output */
const mq = (s) => String(s ?? "").replace(/[\n;:]/g, " ").replace(/\s+/g, " ").trim();
const label = (t) => `${t.event}${t.guard ? ` [${t.guard}]` : ""}`;

/* A screen's states as a Mermaid stateDiagram-v2. */
export function stateDiagram(m) {
  const lines = ["stateDiagram-v2"];
  for (const st of m.states) lines.push(stateId(st) === st ? `    ${st}` : `    state "${st}" as ${stateId(st)}`);
  for (const t of m.transitions) lines.push(`    ${t.from === "[*]" ? "[*]" : stateId(t.from)} --> ${t.to === "[*]" ? "[*]" : stateId(t.to)}: ${mq(t.to === "[*]" ? `${t.event} (${t.via})` : label(t))}`);
  return lines.join("\n") + "\n";
}

/* The same states as a graph, for svg.mjs: start and leave are pills. */
export function stateGraph(m) {
  const nodes = [{ id: "start", label: "start", shape: "pill" }, ...m.states.map((st) => ({ id: stateId(st), label: st, shape: "box" }))];
  if (m.transitions.some((t) => t.to === "[*]")) nodes.push({ id: "leave", label: "leaves the screen", shape: "pill" });
  const edges = m.transitions.map((t) => ({ from: t.from === "[*]" ? "start" : stateId(t.from), to: t.to === "[*]" ? "leave" : stateId(t.to), label: t.to === "[*]" ? t.event : label(t), dashed: t.source === "default" || t.to === "[*]" }));
  return { nodes, edges };
}

const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const joined = (xs, none) => (xs.length ? xs.map(cell).join("; ") : none);
const none = (st) => (st === "loading" ? "None: the content is on its way" : "None on the screen: the navigation stays available");

/* The state table: state, what the user sees, the action available, the announcement. */
export function stateTable(m) {
  return [
    "| State | Entered when | What the user sees | Action available | Announcement |",
    "|---|---|---|---|---|",
    ...m.rows.map((r) => `| ${r.state} | ${joined(r.entered, "—")} | ${cell(r.sees)} | ${joined(r.actions, none(r.state))} | ${cell(r.announcement)} |`),
  ].join("\n");
}

/* The States table of HELIX's wireframe (States and Events): every standard
   state, applying or excluded with its reason, then the screen's own. */
export const STANDARD_STATES = ["ideal", "empty", "loading", "partial", "error", "offline", "slow", "permission-denied", "success"];
const EXCLUDED = {
  partial: "no: not declared in the blueprint; if part of the content can fail on its own, add it to screens[].states",
  offline: "no: not modelled in the blueprint; the app's connection handling covers it, or add it here",
  slow: "no: not modelled in the blueprint; loading shows until the content arrives",
  "permission-denied": "no: not declared in the blueprint; if access can be refused here, add forbidden to screens[].states",
  success: "no: not modelled in the blueprint; an action's confirmation is its transition's feedback in the user flow",
};
export function stateRows(m) {
  const row = (r, name = r.state) => `| ${name}${name !== r.state ? ` (${r.state})` : ""} | yes | ${joined(r.entered, "—")} | ${cell(r.sees)} | ${joined(r.actions, none(r.state))} | ${cell(r.announcement)} | ${joined(r.exits, "none — final")} |`;
  const byState = new Map(m.rows.map((r) => [r.state, r]));
  // The blueprint's forbidden is HELIX's permission-denied.
  const own = (st) => byState.get(st === "permission-denied" ? "forbidden" : st);
  const rows = STANDARD_STATES.map((st) => (own(st) ? row(own(st), st) : `| ${st} | ${EXCLUDED[st] ?? "no: not declared in the blueprint; add it to screens[].states, or give the reason here"} | — | — | — | — | — |`));
  for (const r of m.rows.filter((x) => !STANDARD_STATES.includes(x.state) && x.state !== "forbidden")) rows.push(row(r));
  return ["| State | Applies | Entered when | Person sees | Available actions | Announcement | Exit |", "|---|---|---|---|---|---|---|", ...rows].join("\n");
}

const effect = (t) => {
  if (t.source === "default") return "The SDK's default";
  if (t.source !== "exit") return t.via ? `From the blueprint (${t.via})` : "From the blueprint";
  if (t.via === "back") return "Goes back";
  if (t.via === "out of the app") return "Leaves the app";
  return t.via.startsWith("opens ") ? `Opens ${t.via.slice(6)}` : `Goes ${t.via}`;
};

/* The Events table of HELIX's wireframe: event, from, guard, to, effect. */
export function eventTable(m) {
  return [
    "| Event | From | Guard | To | Effect |",
    "|---|---|---|---|---|",
    ...m.transitions.map((t) => `| ${cell(t.event)} | ${t.from === "[*]" ? "start" : t.from} | ${cell(t.guard ?? "none")} | ${t.to === "[*]" ? "leaves the screen" : t.to} | ${cell(effect(t))} |`),
  ].join("\n");
}

/* A screen's state document: the diagram, the table and the notes. */
export function stateMarkdown(m) {
  return [
    `# States of ${m.title}`,
    "",
    `Drawn by \`ux-builder-blueprint draw\` from the blueprint: screen \`${m.screen}\`${m.pattern ? ` (${m.pattern})` : ""}. Every declared state, the transitions between them, and per state what the user sees, the action available and the announcement.`,
    "",
    "```mermaid",
    stateDiagram(m).trimEnd(),
    "```",
    "",
    stateTable(m),
    "",
    "## Notes",
    "",
    ...(m.notes.length ? m.notes.map((n) => `- ${n}`) : ["None."]),
    "",
  ].join("\n");
}
