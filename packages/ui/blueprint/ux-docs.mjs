/* What the blueprint says in HELIX's UX artifact types (HELIX v0.20.0;
   ADR-042 decision 2; FEAT-015 RPT-09; US-104): the sections of a user-flow
   per feature (UF-<n>), a wireframe per view of it (UF-<n>-<nn>-<view>), with
   the view's state diagram in its States and Events, and a user-journey-map
   per journey; and DESIGN.md's Modalities, Size Classes and App Frame.
   Internal to @ux-builder/ui/blueprint: propose.mjs drafts them as patches.

   Pure functions of the blueprint, in blueprint order: the same blueprint
   gives the same text. Each returns [{ heading, text }], the type's
   template sections it fills; the rest of the template stays as it is. */

import { flowGraph, mermaid, nodeTitle, screensOf, sizesOf, target, walkJourney, walkthrough } from "./project.mjs";
import { eventTable, stateDiagram, stateRows } from "./states.mjs";
import { DEFAULT_MODALITIES, FRAMES, frameFor } from "./modalities.mjs";

const list = (x) => (Array.isArray(x) ? x.filter((y) => y && typeof y === "object") : []);
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const from = (what) => `<!-- From the blueprint's ${what} (ux-builder-blueprint propose). -->`;
const links = (xs) => (xs.length ? xs.map((x) => `[[${x}]]`).join(", ") : "none");
const label = (a) => a.label ?? a.id;

/* The modalities the blueprint supports, and HELIX's name for each (screen, voice, chat). */
const modalitiesOf = (bp) => (Array.isArray(bp?.supports?.modalities) && bp.supports.modalities.length ? bp.supports.modalities : DEFAULT_MODALITIES);
const HELIX_MODALITY = { "responsive-web": "screen", chat: "chat", "hybrid-chat": "chat" };
/* A screen of the blueprint is a screen, unless the app is chat only. */
const viewModality = (bp) => (modalitiesOf(bp).some((m) => HELIX_MODALITY[m] === "screen") ? "screen" : "chat");

/* ------------------------------------------------------------- wireframe */
/* One view (a screen) of a user flow: HELIX's wireframe, with the screen's
   state model in States and Events. */
export function wireframeSections(m, { bp, screen, id }) {
  const s = screen.s;
  const sizes = sizesOf(bp);
  const screens = screensOf(bp);
  const file = (state, size) => `${state === "ideal" ? s.id : `${s.id}.${state}`}.${size}.png`;
  const actions = list(s.actions);
  const where = (a) => {
    const t = target(a.to, { screen: s.id }, screens);
    if (!t) return a.to ? `\`${a.to}\`` : "—";
    if (t.kind === "screen" || t.kind === "modal") return `opens ${nodeTitle(screens, t)}`;
    if (t.kind === "state") return `shows the ${t.state} state`;
    return t.kind === "back" ? "goes back" : "leaves the app";
  };
  const rows = [
    `| Page heading | region | Names the view: "${cell(s.title ?? s.id)}" | all | — |`,
    `| Content | region | The ${cell(s.pattern ?? "screen")}'s content; in other states it is replaced (see States and Events) | all | States and Events |`,
    ...actions.map((a) => `| ${cell(label(a))} | control | ${cell(a.primary ? `The primary action: ${where(a)}` : where(a).charAt(0).toUpperCase() + where(a).slice(1))}${a.destructive ? ` (destructive: ${cell(a.destructive)})` : ""} | all | transition "${cell(label(a))}" |`),
  ];
  return [
    { heading: "Scope and Fidelity", text: [from(`screen \`${s.id}\``), `- **View**: ${s.title ?? s.id} (\`${s.id}\`)`, ...(s.purpose ? [`- **Purpose**: ${s.purpose}`] : []), `- **Modality**: ${viewModality(bp)}`, "- **Fidelity**: mid", `- **Size classes**: ${sizes.join(", ")}`, `- **Pattern**: ${s.pattern ?? "none"}`, ...(list(s.content).length ? [`- **Content, highest priority first**: ${list(s.content).filter((c) => c?.label).map((c, i) => `${i + 1}. ${c.label}${c.kind ? ` (${c.kind})` : ""}`).join("; ")}`] : [])].join("\n") },
    { heading: "Layouts", text: [`<!-- Drawn by ux-builder-blueprint wireframes from the real pattern, in the plain theme. Copy each PNG from its output (blueprint-wireframes/) to assets/ under the name shown; the other states are in States and Events. -->`,
      ...sizes.flatMap((size) => ["", `### ${size}`, "", `![${id} ${size}](assets/${id}-${size}.png)`, "", `Source: \`blueprint-wireframes/${file("ideal", size)}\`; its states: ${m.states.filter((st) => st !== "ideal").map((st) => `\`${file(st, size)}\``).join(", ") || "none"}.`]),
      "", "### Annotations", "", from(`screen \`${s.id}\`'s actions`), "| Element | Kind | Annotation | Size classes | Links |", "|---|---|---|---|---|", ...rows].join("\n").replace(/^\n/, "") },
    { heading: "States and Events", text: ["### States", "", from(`screen \`${m.screen}\`'s states`), stateRows(m), "", "### Statechart", "", from(`screen \`${m.screen}\`'s states and actions`), "```mermaid", stateDiagram(m).trimEnd(), "```", "", "### Events", "", from(`screen \`${m.screen}\`'s actions and journeys`), eventTable(m)].join("\n") },
    { heading: "Accessibility", text: [`- **Focus order**: ${rows.map((r) => r.split(" | ")[0].slice(2)).join(", ")}`, `- **Accessible names**: ${actions.length ? actions.map((a) => `"${label(a)}"`).join(", ") : "none on the view"}: each control's label is its name`, `- **Headings and landmarks**: one h1 (${s.title ?? s.id}) in main${bp.kind === "view" ? "; the host owns the landmarks" : "; AppShell's navigation landmark"}`, `- **Target size and input**: the SDK's controls; \`ux-builder-audit\` checks target size at each size class`].join("\n") },
    { heading: "Open Questions", text: m.notes.length ? m.notes.map((n) => `- ${n}`).join("\n") : "- None from the blueprint." },
  ];
}

/* ------------------------------------------------------------- user-flow */
/* One feature's user flow: its views (the blueprint's screens and their
   modals), the actions between them, the journeys' paths and alternates.
   bp is the blueprint cut to the feature's screens; wireframes maps a
   screen to its wireframe ID; deadEnds are the flow checks' findings. */
export function userFlowSections(bp, { stories = [], wireframes = new Map(), deadEnds = [] } = {}) {
  const screens = screensOf(bp);
  const views = [], trans = [];
  for (const [id, { s, modals }] of screens) {
    const wf = wireframes.get(id);
    views.push(`| ${cell(s.title ?? id)} | screen | ${cell(s.purpose ?? s.pattern ?? "—")} | ${Array.isArray(s.stories) && s.stories.length ? s.stories.join(", ") : "—"} | ${wf ? `[[${wf}]]` : "—"} |`);
    for (const [mid, m] of modals) views.push(`| ${cell(m.title || mid)} | modal | ${cell(`${m.kind ?? "dialog"} over ${s.title ?? id}`)} | — | ${wf ? `[[${wf}]] (its dialog)` : "—"} |`);
  }
  const named = new Map();
  let external = false;
  for (const [id, { modals }] of screens) for (const at of [{ screen: id }, ...[...modals.keys()].map((m) => ({ screen: id, modal: m }))]) {
    const owner = at.modal ? modals.get(at.modal) : screens.get(id).s;
    for (const a of list(owner.actions)) {
      const t = target(a.to, at, screens);
      named.set(a, label(a));
      if (t?.kind === "external") external = true;
      const to = !t ? `\`${a.to}\`` : t.kind === "screen" || t.kind === "modal" ? nodeTitle(screens, t) : t.kind === "state" ? `${nodeTitle(screens, at)} (${t.state})` : t.kind === "back" ? (at.modal ? nodeTitle(screens, { screen: id }) : "back") : "external";
      const feedback = t?.kind === "state" ? `the ${t.state} state` : a.destructive ? `${a.destructive} (destructive)` : a.highImpact ? `approval: ${a.highImpact}` : t?.kind === "back" ? (at.modal ? "the dialog closes" : "the previous view") : t?.kind === "external" ? "leaves the app" : "the view it opens";
      const region = t?.kind === "modal" ? "dialog over the view" : t?.kind === "state" ? "the view's content" : at.modal && t?.kind === "back" ? "the dialog closes" : "full view";
      trans.push(`| ${cell(label(a))} | ${cell(nodeTitle(screens, at))} | button | none | ${cell(to)} | ${cell(feedback)} | ${region} |`);
    }
  }
  const dests = list(bp.destinations).filter((d) => screens.has(d.screen));
  const tasks = new Map(list(bp.tasks).filter((t) => typeof t.id === "string").map((t) => [t.id, t]));
  const alts = [], trace = [];
  for (const j of list(bp.journeys).filter((x) => typeof x.id === "string")) {
    const { main, alternates } = walkJourney(j, screens);
    const end = (ws) => (ws.length ? nodeTitle(screens, ws[ws.length - 1].to?.kind === "screen" || ws[ws.length - 1].to?.kind === "modal" ? ws[ws.length - 1].to : ws[ws.length - 1].node ?? { screen: ws[ws.length - 1].st.screen }) : null);
    const path = (ws) => { const p = ws.map((w) => named.get(w.action)).filter(Boolean); return p.length ? `${p.join(" → ")} → ${end(ws)}` : "—"; };
    const ac = Array.isArray(j.criteria) && j.criteria.length ? j.criteria.join(", ") : j.story ?? "—";
    const t = tasks.get(j.task);
    const task = t ? `${t.goal ?? t.id}` : j.task ?? "—";
    trace.push(`| ${j.id} | ${cell(task)} | ${cell(ac)} | ${cell(path(main))} |`);
    alternates.forEach(({ alt, steps }, i) => {
      trace.push(`| ${j.id} alternate ${i + 1} | ${cell(task)} | ${cell(ac)} | ${cell(path(steps))} |`);
      alts.push(`| ${cell(steps.some((w) => w.st.state === "error") ? "Error" : "Alternate")}: ${cell(alt.reason ?? `${j.id} alternate ${i + 1}`)} | ${cell(alt.reason ?? "—")} | ${cell(path(steps))} | ${cell(steps.length ? `Ends on ${end(steps)}` : "—")} |`);
    });
  }
  for (const [id, { s }] of screens) for (const st of ["empty", "error", "forbidden"].filter((x) => Array.isArray(s.states) && s.states.includes(x))) {
    const kind = { empty: "Empty", error: "Error", forbidden: "Permission denied" }[st];
    const what = { empty: "has nothing to show", error: "does not load", forbidden: "is refused" }[st];
    alts.push(`| ${kind}: ${cell(s.title ?? id)} | ${cell(s.title ?? id)} ${what} | — | Its ${st} state (see its wireframe's States and Events) |`);
  }
  return [
    { heading: "Scope", text: [from("screens, destinations and actions"), `- **Covers**: ${[...screens.values()].map(({ s }) => s.title ?? s.id).join(", ")}`, `- **Entry points**: ${bp.kind === "view" ? "the host app opens the view's first screen" : dests.length ? dests.map((d) => `${d.label ?? d.id} (navigation)`).join(", ") : "—"}`, `- **Exits**: back${external ? ", and actions that leave the app (external)" : ""}`, `- **Size classes**: ${sizesOf(bp).join(", ")} — the navigation moves (AppShell); the flow is the same`, `- **Out of scope**: none named${stories.length ? `; stories: ${links(stories)}` : ""}`].join("\n") },
    { heading: "Views", text: [from("screens and modals"), "| View | Kind | Purpose | Stories | Wireframe |", "|---|---|---|---|---|", ...views].join("\n") },
    { heading: "Flow Diagram", text: [from("screens and actions"), "```mermaid", mermaid(flowGraph(bp)).trimEnd(), "```"].join("\n") },
    { heading: "Transitions", text: [from("actions"), "| Action | From | Control | Guard | To | Feedback | Changed region |", "|---|---|---|---|---|---|---|", ...trans].join("\n") },
    { heading: "Alternate Paths", text: [from("journeys' alternates and the screens' states"), "| Path | Trigger | Transitions | Recovery |", "|---|---|---|---|", ...(alts.length ? alts : ["| — | None in the blueprint | — | — |"])].join("\n") },
    { heading: "Story Traceability", text: [from("journeys"), "| Journey | Task | Stories / ACs | Path |", "|---|---|---|---|", ...(trace.length ? trace : ["| — | — | No journeys in the blueprint | — |"])].join("\n") },
    { heading: "Dead Ends", text: ["<!-- From the blueprint's flow checks, as `ux-builder-blueprint check` reports them (ux-builder-blueprint propose). -->", ...(deadEnds.length ? deadEnds.map((d) => `- ${d}`) : ["- None"])].join("\n") },
  ];
}

/* ------------------------------------------------------ user-journey-map */
export function journeyMapSections(bp, j) {
  const screens = screensOf(bp);
  const { main } = walkJourney(j, screens);
  const sentences = walkthrough(j, screens).split("\n").slice(1).map((l) => l.replace(/^\d+\.\s*/, "").replace(/\*\*/g, ""));
  const ac = Array.isArray(j.criteria) && j.criteria.length ? j.criteria.join(", ") : `uncovered: journey ${j.id} names no criteria`;
  const title = (w) => (w.node ? nodeTitle(screens, w.node) : String(w.st.screen));
  const task = list(bp.tasks).find((t) => t.id === j.task);
  const first = main[0], last = main[main.length - 1];
  return [
    { heading: "Actor and Scenario", top: true, text: [from(`journey ${j.id}`), `- **Person**: the person using ${bp.name ?? "the app"} for ${j.story ? `[[${j.story}]]` : "this journey"} (name the PRD user segment)`, `- **Task**: ${task ? task.goal ?? task.id : j.task ?? "the task in the feature's Task Model this journey carries out (name it)"}`, `- **Scenario**: ${main.length ? `from ${title(first)} to ${title(last)}, in ${main.length} step${main.length === 1 ? "" : "s"}` : "no steps"}`, `- **Trigger**: ${first ? `the person opens ${title(first)}` : "—"}`, `- **End state**: ${last ? sentences[sentences.length - 1] : "—"}`].join("\n") },
    { heading: "Journey Phases", text: [from(`journey ${j.id}'s steps`), "| Phase | Actions | Thoughts | Emotion | Touchpoints | Stories / ACs |", "|---|---|---|---|---|---|",
      ...main.map((w, k) => `| ${k + 1}. ${cell(title(w))} | ${cell(sentences[k])} | (assumption) | neutral (assumption) | view \`${cell(w.node?.screen ?? w.st.screen)}\` | ${cell(ac)} |`)].join("\n") },
    { heading: "Story Coverage", text: [from(`journey ${j.id}`), "| Phase | Covered by | Gap |", "|---|---|---|", ...main.map((w, k) => `| ${k + 1}. ${cell(title(w))} | ${cell(j.story ? `${j.story}: ${ac}` : ac)} | ${j.story ? "None" : "No story names this journey"} |`)].join("\n") },
  ];
}

/* ------------------------------------------------------------- DESIGN.md */
/* DESIGN.md's Modalities, Size Classes and App Frame (ADR-041, ADR-042):
   the blueprint's supports.modalities, size classes and supports.frame. */
const WIDTHS = { compact: "below 600 px", medium: "from 600 px", expanded: "from 840 px", large: "from 1200 px", "extra-large": "from 1600 px" };
export function modalitySection(bp) {
  const ms = modalitiesOf(bp);
  const dests = list(bp.destinations).length;
  const frame = bp.kind === "view" ? null : bp.supports?.frame ?? null;
  const frameLine = bp.kind === "view"
    ? "none: an embedded view; the host draws the frame"
    : frame
      ? `${frame} — ${FRAMES[frame] ?? "as the blueprint names it"}`
      : `not chosen in the blueprint (supports.frame); for ${dests} destination${dests === 1 ? "" : "s"} ux-builder recommends ${frameFor(dests)} — ${FRAMES[frameFor(dests)]}`;
  return [
    from("supports"),
    `- **Supported modalities**: ${[...new Set(ms.map((m) => HELIX_MODALITY[m] ?? m))].join(", ")} (${ms.join(", ")})`,
    `- **Size classes**: ${sizesOf(bp).map((s) => `${s} ${WIDTHS[s] ?? ""}`.trim()).join(", ")}`,
    `- **App frame**: ${frameLine}`,
  ].join("\n");
}
