/* What the blueprint says in HELIX's UX artifact types (FEAT-015 RPT-09;
   US-104; ADR-033; docs/proposals/helix-ux-artifact-types): the sections of
   an interaction-state-diagram and a wireframe per screen, a screen-flow
   per feature and a user-journey-map per journey. Internal to
   @ux-builder/ui/blueprint: propose.mjs drafts them, as patches when the
   installed HELIX defines the type, and as drafts in its output when not.

   Pure functions of the blueprint, in blueprint order: the same blueprint
   gives the same text. Each returns [{ heading, text }], the type's
   template sections it fills; the rest of the template stays as it is. */

import { flowGraph, mermaid, nodeTitle, screensOf, sizesOf, target, walkJourney, walkthrough } from "./project.mjs";
import { inventory, stateDiagram, stateMatrix, transitionTable } from "./states.mjs";

const list = (x) => (Array.isArray(x) ? x.filter((y) => y && typeof y === "object") : []);
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const from = (what) => `<!-- From the blueprint's ${what} (ux-builder-blueprint propose). -->`;
const links = (xs) => (xs.length ? xs.map((x) => `[[${x}]]`).join(", ") : "none");

/* The UX types, in the order propose drafts them, with their ID prefix. */
export const UX_TYPES = { "interaction-state-diagram": "ISD", wireframe: "WF", "screen-flow": "SF", "user-journey-map": "UJM" };

/* --------------------------------------------- interaction-state-diagram */
export function stateDiagramSections(m, { screen, wf, sf }) {
  const modals = [...screen.modals.values()].map((x) => x.title || x.id);
  return [
    { heading: "Scope", text: [from(`screen \`${m.screen}\``), `- **Covers**: ${m.title} (\`${m.screen}\`${m.pattern ? `, ${m.pattern}` : ""}): the states its content region can be in`, `- **Uses**: ${m.pattern ? `the ${m.pattern} pattern's own states; StatePanel and Skeleton from @ux-builder/ui` : "StatePanel and Skeleton from @ux-builder/ui"}`, `- **Out of scope**: ${modals.length ? `the dialogs ${modals.join(", ")}, ` : ""}the app's navigation${sf ? ` (see [[${sf}]])` : ""}${wf ? `; layout (see [[${wf}]])` : ""}`].join("\n") },
    { heading: "State Inventory", text: [from(`screen \`${m.screen}\`'s states`), inventory(m)].join("\n") },
    { heading: "Statechart", text: [from(`screen \`${m.screen}\`'s states and actions`), "```mermaid", stateDiagram(m).trimEnd(), "```"].join("\n") },
    { heading: "State Matrix", text: [from(`screen \`${m.screen}\`'s states`), stateMatrix(m)].join("\n") },
    { heading: "Events and Transitions", text: [from(`screen \`${m.screen}\`'s actions and journeys`), transitionTable(m)].join("\n") },
    { heading: "Open Questions", text: m.notes.length ? m.notes.map((n) => `- ${n}`).join("\n") : "- None from the blueprint." },
  ];
}

/* ------------------------------------------------------------- wireframe */
export function wireframeSections(m, { bp, screen, id, isd }) {
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
    `| 1 | Page heading | region | Names the screen: "${cell(s.title ?? s.id)}" | all | — |`,
    `| 2 | Content | region | The ${cell(s.pattern ?? "screen")}'s content; in other states it is replaced (see States Covered) | all | ${isd ? `[[${isd}]]` : "—"} |`,
    ...actions.map((a, i) => `| ${i + 3} | ${cell(a.label ?? a.id)} | control | ${cell(a.primary ? `The primary action: ${where(a)}` : where(a).charAt(0).toUpperCase() + where(a).slice(1))}${a.destructive ? ` (destructive: ${cell(a.destructive)})` : ""} | all | action \`${cell(a.id)}\` |`),
  ];
  return [
    { heading: "Scope and Fidelity", text: [from(`screen \`${s.id}\``), `- **Screen**: ${s.title ?? s.id}`, "- **Fidelity**: mid", `- **Size classes**: ${sizes.join(", ")}`, `- **Pattern**: ${s.pattern ?? "none"}`].join("\n") },
    { heading: "Layouts", text: [`<!-- Drawn by ux-builder-blueprint wireframes from the real pattern, in the plain theme. Copy each PNG from its output (blueprint-wireframes/) to assets/ under the name shown. -->`,
      ...sizes.flatMap((size) => ["", `### ${size}`, "", `![${id} ${size}](assets/${id}-${size}.png)`, "", `Source: \`blueprint-wireframes/${file("ideal", size)}\`.`])].join("\n").replace(/^\n/, "") },
    { heading: "Annotations", text: [from(`screen \`${s.id}\`'s actions`), "| # | Element | Kind | Annotation | Size classes | Links |", "|---|---|---|---|---|---|", ...rows].join("\n") },
    { heading: "States Covered", text: [from(`screen \`${s.id}\`'s states`), "| State | Shown here | Or see |", "|---|---|---|", ...m.states.map((st) => `| ${st} | ${sizes.map((size) => `\`${file(st, size)}\``).join(", ")} | ${isd ? `[[${isd}]]` : "—"} |`)].join("\n") },
    { heading: "Accessibility", text: [`- **Focus order**: ${rows.map((_, i) => i + 1).join(", ")}`, `- **Accessible names**: ${actions.length ? actions.map((a) => `"${a.label ?? a.id}"`).join(", ") : "none on the screen"}: each control's label is its name`, `- **Headings and landmarks**: one h1 (${s.title ?? s.id}) in main${bp.kind === "view" ? "; the host owns the landmarks" : "; AppShell's navigation landmark"}`, `- **Target size and input**: the SDK's controls; \`ux-builder-audit\` checks target size at each size class`].join("\n") },
  ];
}

/* ----------------------------------------------------------- screen-flow */
export function screenFlowSections(bp, { stories = [] } = {}) {
  const screens = screensOf(bp);
  const nodes = [], trans = [];
  for (const [id, { s, modals }] of screens) {
    nodes.push(`| \`${id}\` | screen | ${cell(s.title ?? id)} | ${cell(s.pattern ?? "—")} | ${Array.isArray(s.stories) && s.stories.length ? s.stories.map((x) => `[[${x}]]`).join(", ") : "—"} |`);
    for (const [mid, m] of modals) nodes.push(`| \`${id} modal:${mid}\` | modal | ${cell(m.title || mid)} | ${cell(m.kind ?? "dialog")} | — |`);
  }
  const tid = new Map();
  for (const [id, { modals }] of screens) for (const at of [{ screen: id }, ...[...modals.keys()].map((m) => ({ screen: id, modal: m }))]) {
    const owner = at.modal ? modals.get(at.modal) : screens.get(id).s;
    for (const a of list(owner.actions)) {
      const t = target(a.to, at, screens);
      const T = `T${trans.length + 1}`;
      tid.set(a, T);
      const to = !t ? `\`${a.to}\`` : t.kind === "screen" || t.kind === "modal" ? nodeTitle(screens, t) : t.kind === "state" ? `${nodeTitle(screens, at)} (${t.state})` : t.kind === "back" ? "back" : "external";
      const feedback = t?.kind === "state" ? `the ${t.state} state` : a.destructive ? `${a.destructive} (destructive)` : a.highImpact ? `approval: ${a.highImpact}` : "—";
      const region = t?.kind === "modal" ? "dialog over the screen" : t?.kind === "state" ? "the screen's content" : at.modal && t?.kind === "back" ? "the dialog closes" : "full screen";
      trans.push(`| ${T} | ${cell(nodeTitle(screens, at))} | ${cell(`${a.label ?? a.id} — button`)} | — | ${cell(to)} | ${cell(feedback)} | ${region} |`);
    }
  }
  const dests = list(bp.destinations);
  const alts = [], trace = [];
  for (const j of list(bp.journeys).filter((x) => typeof x.id === "string")) {
    const { main, alternates } = walkJourney(j, screens);
    const path = (ws) => ws.map((w) => tid.get(w.action)).filter(Boolean).join(" → ") || "—";
    const ac = (Array.isArray(j.criteria) && j.criteria.length ? j.criteria.join(", ") : j.story ?? "—");
    trace.push(`| ${j.id} | ${cell(ac)} | ${path(main)} | — |`);
    alternates.forEach(({ alt, steps }, i) => {
      trace.push(`| ${j.id} alternate ${i + 1} | ${cell(ac)} | ${path(steps)} | ${cell(alt.reason ?? "—")} |`);
      alts.push(`| ${cell(steps.some((w) => w.st.state === "error") ? "Error" : "Alternate")} | ${cell(alt.reason ?? `${j.id} alternate ${i + 1}`)} | ${path(steps)} | ${cell(steps.length ? `Ends on ${nodeTitle(screens, steps[steps.length - 1].node ?? { screen: steps[steps.length - 1].st.screen })}` : "—")} |`);
    });
  }
  for (const [id, { s }] of screens) if (Array.isArray(s.states) && s.states.includes("error")) alts.push(`| Error | ${cell(s.title ?? id)} does not load | — | Its error state offers Try again (see its interaction-state diagram) |`);
  return [
    { heading: "Scope", text: [from("screens, destinations and actions"), `- **Covers**: ${[...screens.values()].map(({ s }) => s.title ?? s.id).join(", ")}`, `- **Entry points**: ${bp.kind === "view" ? "the host app opens the view's first screen" : dests.length ? dests.map((d) => `${d.label ?? d.id} (navigation)`).join(", ") : "—"}`, "- **Exits**: back, and actions that leave the app (external)", "- **Fidelity**: boxes — the flow from the blueprint; layout is in the wireframes", `- **Size classes**: ${sizesOf(bp).join(", ")} — the navigation moves (AppShell); the flow is the same`, `- **Out of scope**: none named${stories.length ? `; stories: ${links(stories)}` : ""}`].join("\n") },
    { heading: "Nodes", text: [from("screens and modals"), "| ID | Kind | Title | Purpose | Stories |", "|---|---|---|---|---|", ...nodes].join("\n") },
    { heading: "Flow Diagram", text: [from("screens and actions"), "```mermaid", mermaid(flowGraph(bp)).trimEnd(), "```"].join("\n") },
    { heading: "Transitions", text: [from("actions"), "| ID | From | Action (hotspot) | Guard | To | Feedback | Changed region |", "|---|---|---|---|---|---|---|", ...trans].join("\n") },
    { heading: "Alternate Paths", text: [from("journeys' alternates and the screens' error states"), "| Path | Trigger | Transitions | Recovery |", "|---|---|---|---|", ...(alts.length ? alts : ["| — | None in the blueprint | — | — |"])].join("\n") },
    { heading: "Journey Traceability", text: [from("journeys"), "| Journey | Story / ACs | Path | Notes |", "|---|---|---|---|", ...(trace.length ? trace : ["| — | No journeys in the blueprint | — | — |"])].join("\n") },
  ];
}

/* ------------------------------------------------------ user-journey-map */
export function journeyMapSections(bp, j) {
  const screens = screensOf(bp);
  const { main } = walkJourney(j, screens);
  const sentences = walkthrough(j, screens).split("\n").slice(1).map((l) => l.replace(/^\d+\.\s*/, "").replace(/\*\*/g, ""));
  const ac = Array.isArray(j.criteria) && j.criteria.length ? j.criteria.join(", ") : `uncovered: journey ${j.id} names no criteria`;
  const title = (w) => (w.node ? nodeTitle(screens, w.node) : String(w.st.screen));
  const first = main[0], last = main[main.length - 1];
  return [
    { heading: "Actor and Scenario", text: [from(`journey ${j.id}`), `- **Actor**: the person using ${bp.name ?? "the app"} for ${j.story ? `[[${j.story}]]` : "this journey"} (name the PRD persona)`, `- **Scenario**: ${main.length ? `from ${title(first)} to ${title(last)}, in ${main.length} step${main.length === 1 ? "" : "s"}` : "no steps"}`, `- **Trigger**: ${first ? `the actor opens ${title(first)}` : "—"}`, `- **End state**: ${last ? sentences[sentences.length - 1] : "—"}`].join("\n") },
    { heading: "Journey Phases", text: [from(`journey ${j.id}'s steps`), "| Phase | Actions | Thoughts | Emotion | Touchpoints | Stories / ACs |", "|---|---|---|---|---|---|",
      ...main.map((w, k) => `| ${k + 1}. ${cell(title(w))} | ${cell(sentences[k])} | (assumption) | neutral (assumption) | \`${cell(w.node?.screen ?? w.st.screen)}\` | ${cell(ac)} |`)].join("\n") },
    { heading: "Story Coverage", text: [from(`journey ${j.id}`), "| Phase | Covered by | Gap |", "|---|---|---|", ...main.map((w, k) => `| ${k + 1}. ${cell(title(w))} | ${cell(j.story ? `${j.story}: ${ac}` : ac)} | ${j.story ? "None" : "No story names this journey"} |`)].join("\n") },
  ];
}
