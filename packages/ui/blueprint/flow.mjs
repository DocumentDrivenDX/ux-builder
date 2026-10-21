/* The flow and journey checks of the blueprint (FEAT-012 FLW-02, JRN-02,
   JRN-03; ADR-030; CONTRACT-005 Flows and journeys). Internal to
   @ux-builder/ui/blueprint: checkBlueprint calls checkFlow.

   The screens and their modals are nodes; actions (`to`) are edges. A
   journey is a walk through them. Reads only the blueprint, and the HELIX
   stories when the caller passes them, so it runs in Node or a browser. */

import catalogue from "../catalogue.json" with { type: "json" };

const STATES = ["empty", "loading", "error"];
const STATUSES = new Map(catalogue.patterns.map((p) => [p.name, p.statuses ?? []]));
const list = (x) => (Array.isArray(x) ? x.filter((y) => y && typeof y === "object") : []);
const quoted = (xs) => xs.map((x) => `"${x}"`).join(", ");
const and = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs.join(""));

/* Every modal in a screen, nested ones included, with its path. */
function* modalsOf(modals, path) {
  for (const [i, m] of (Array.isArray(modals) ? modals : []).entries()) {
    if (!m || typeof m !== "object") continue;
    yield { m, path: [...path, i] };
    yield* modalsOf(m.modals, [...path, i, "modals"]);
  }
}

/* The graph: each screen by ID with its path and modals. */
function graph(bp) {
  const screens = new Map();
  (Array.isArray(bp.screens) ? bp.screens : []).forEach((s, i) => {
    if (!s || typeof s !== "object" || typeof s.id !== "string" || screens.has(s.id)) return;
    const modals = new Map();
    for (const { m, path } of modalsOf(s.modals, ["screens", i, "modals"])) if (typeof m.id === "string" && !modals.has(m.id)) modals.set(m.id, { m, path });
    screens.set(s.id, { s, at: ["screens", i], modals });
  });
  return screens;
}

/* Where an action's `to` leads from a screen: a node, back, external, or
   null when it names nothing. A state is the screen's own (declared, or one
   its pattern has) or one of the three every screen may have. */
function resolve(to, screen, screens) {
  if (typeof to !== "string") return null;
  if (to === "back") return { kind: "back" };
  if (to === "external") return { kind: "external" };
  if (to.startsWith("modal:")) return screen.modals.has(to.slice(6)) ? { kind: "modal", screen: screen.s.id, modal: to.slice(6) } : null;
  if (to.startsWith("state:")) {
    const st = to.slice(6);
    const known = new Set([...STATES, ...(Array.isArray(screen.s.states) ? screen.s.states : []), ...(STATUSES.get(screen.s.pattern) ?? [])]);
    return known.has(st) ? { kind: "state", screen: screen.s.id, state: st } : null;
  }
  return screens.has(to) ? { kind: "screen", screen: to } : null;
}
const key = (n) => (n.kind === "modal" ? `${n.screen} modal:${n.modal}` : n.screen);
const nameOf = (n, screens) => (n.kind === "modal" ? `modal "${screens.get(n.screen).modals.get(n.modal).m.title || n.modal}"` : `"${screens.get(n.screen).s.title ?? n.screen}"`);

/* The actions of a node (a screen or one of its modals) with their paths. */
function actionsOf(n, screens) {
  const sc = screens.get(n.screen);
  const [owner, at] = n.kind === "modal" ? [sc.modals.get(n.modal).m, sc.modals.get(n.modal).path] : [sc.s, sc.at];
  return list(owner.actions).map((a) => ({ a, path: [...at, "actions", owner.actions.indexOf(a)] }));
}

/* The safeguard and approval of an action. actions[] and the older lists
   are views of the same list (FLW-03): an action named in destructiveActions
   or ai.highImpactActions takes its safeguard or approval from there. */
function risk(a, s) {
  const d = list(s.destructiveActions).find((x) => x.label === a.label);
  const h = list(s.ai?.highImpactActions).find((x) => x.label === a.label);
  return {
    destructive: "destructive" in a || !!d, safeguard: a.destructive ?? d?.safeguard,
    highImpact: "highImpact" in a || !!h, approval: a.highImpact ?? h?.approval,
  };
}

/* Findings for the flow and the journeys, through add(rule, path, message,
   fix). `on(rule)` says whether a rule applies to the blueprint. `helix`,
   when given, is { stories: { "US-12": { criteria: ["US-12-AC1", …] } } }. */
export function checkFlow(bp, { add, on, helix }) {
  const screens = graph(bp);
  const nodes = [...screens.values()].flatMap((sc) => [{ owner: sc.s, at: sc.at, node: { kind: "screen", screen: sc.s.id } },
    ...[...sc.modals.values()].map(({ m, path }) => ({ owner: m, at: path, node: { kind: "modal", screen: sc.s.id, modal: m.id } }))]);
  const flows = nodes.some((x) => Array.isArray(x.owner.actions));

  if (flows) {
    // flow.target-exists: an action leads to a screen, a modal of its screen, back, a state or out of the app.
    for (const { node } of nodes) {
      const sc = screens.get(node.screen);
      for (const { a, path } of actionsOf(node, screens)) {
        if (on("flow.target-exists") && typeof a.to === "string" && !resolve(a.to, sc, screens)) {
          add("flow.target-exists", path, `"${a.label ?? a.id}" on ${nameOf(node, screens)} leads to "${a.to}", which names no screen, modal of "${sc.s.title ?? sc.s.id}" or state.`, `Set to to a screen ID (${quoted([...screens.keys()])}), modal:<id> of this screen${sc.modals.size ? ` (${quoted([...sc.modals.keys()].map((m) => `modal:${m}`))})` : ""}, back, state:<state> or external.`);
        }
      }
    }

    // Entry screens: the destinations of an app, or a view's first screen. The
    // app's navigation (or the host) leads on from them.
    const entries = bp.kind === "view" ? [...screens.keys()].slice(0, 1)
      : list(bp.destinations).map((d) => d.screen).filter((id) => screens.has(id));

    // flow.reachable: from the entries, through every action of a reached
    // screen and of its modals. Navigation is the same at every size class
    // today (a destination has no size-class field, and AppShell keeps every
    // destination reachable, beyond five behind "More"), so a screen
    // unreachable at one supported size class is unreachable at all of them.
    if (on("flow.reachable")) {
      const sizes = Array.isArray(bp.supports?.sizeClasses) ? bp.supports.sizeClasses : [];
      const reached = new Set(entries), queue = [...entries];
      while (queue.length) {
        const sc = screens.get(queue.shift());
        for (const node of [{ kind: "screen", screen: sc.s.id }, ...[...sc.modals.keys()].map((m) => ({ kind: "modal", screen: sc.s.id, modal: m }))]) {
          for (const { a } of actionsOf(node, screens)) {
            const t = resolve(a.to, sc, screens);
            if (t?.kind === "screen" && !reached.has(t.screen)) { reached.add(t.screen); queue.push(t.screen); }
          }
        }
      }
      for (const sc of screens.values()) if (!reached.has(sc.s.id)) {
        add("flow.reachable", sc.at, `"${sc.s.title ?? sc.s.id}" is unreachable at ${and(sizes) || "every size class"}: no destination, and no action of a reachable screen or modal, leads to it.`, bp.kind === "view" ? "Add an action that leads to it from the view's first screen or a modal, or remove it." : "Add it to destinations, or add an action that leads to it from a reachable screen or modal.");
      }
    }

    // flow.no-dead-end: a screen or modal that declares actions offers a way
    // on or back: back, external, another screen, or (a modal) its dismiss.
    if (on("flow.no-dead-end")) for (const { owner, at, node } of nodes) {
      if (!Array.isArray(owner.actions) || (node.kind === "screen" && entries.includes(node.screen))) continue;
      const sc = screens.get(node.screen);
      const out = actionsOf(node, screens).some(({ a }) => { const t = resolve(a.to, sc, screens); return t && (t.kind === "back" || t.kind === "external" || (t.kind === "screen" && t.screen !== node.screen)); });
      const name = nameOf(node, screens);
      if (!out && !(node.kind === "modal" && owner.dismiss)) add("flow.no-dead-end", [...at, "actions"], `${name[0].toUpperCase()}${name.slice(1)} is a dead end: no action leads on or back.`, 'Add an action to another screen, to "back" or to "external".');
    }

    // flow.primary-consistent: one primary action, and the same one primaryAction names.
    if (on("flow.primary-consistent")) for (const sc of screens.values()) {
      const acts = list(sc.s.actions);
      if (!Array.isArray(sc.s.actions)) continue;
      const primaries = acts.filter((a) => a.primary === true);
      const label = sc.s.primaryAction?.label;
      primaries.slice(1).forEach((a) => add("flow.primary-consistent", [...sc.at, "actions", sc.s.actions.indexOf(a)], `"${sc.s.title ?? sc.s.id}" has more than one primary action: "${primaries[0].label}" and "${a.label}".`, "Mark one action primary; a screen leads with one."));
      if (typeof label === "string") {
        if (!acts.some((a) => a.label === label)) add("flow.primary-consistent", [...sc.at, "primaryAction"], `The primary action "${label}" of "${sc.s.title ?? sc.s.id}" is not among its actions.`, `Add an action labelled "${label}" with primary: true, or make primaryAction name one of: ${quoted(acts.map((a) => a.label))}.`);
        else if (primaries[0] && primaries[0].label !== label) add("flow.primary-consistent", [...sc.at, "actions", sc.s.actions.indexOf(primaries[0])], `"${primaries[0].label}" is marked primary on "${sc.s.title ?? sc.s.id}", but primaryAction is "${label}".`, `Mark "${label}" primary instead, or change primaryAction.`);
      }
    }
  }

  // ------------------------------------------------------------ journeys
  list(bp.journeys).forEach((j) => {
    const at = ["journeys", bp.journeys.indexOf(j)];
    const steps = list(j.steps);
    if (!steps.length) return;
    const entry = typeof j.entry === "string" ? screens.get(j.entry) : null;
    if (on("journey.walkable") && typeof j.entry === "string" && !entry) add("journey.walkable", [...at, "entry"], `Journey ${j.id} starts on "${j.entry}", which is not a screen.`, `Name one of: ${quoted([...screens.keys()])}.`);

    /* Walk steps from a context (the node it is on, and the screens behind
       it for back). Returns the context before each step. */
    const walk = (steps, stepsPath, start) => {
      let expected = start.expected, history = [...start.history], current = start.current;
      const before = [];
      steps.forEach((st, k) => {
        const path = [...stepsPath, k];
        before[k] = { current, history: [...history] };
        if (!st || typeof st !== "object") { expected = undefined; return; }
        // A step on a modal names it modal:<id>, a modal of the screen the journey is on.
        const node = typeof st.screen !== "string" ? null
          : st.screen.startsWith("modal:") ? (current && screens.get(current.screen).modals.has(st.screen.slice(6)) ? { kind: "modal", screen: current.screen, modal: st.screen.slice(6) } : null)
          : screens.has(st.screen) ? { kind: "screen", screen: st.screen } : null;
        if (!node) {
          if (on("journey.walkable")) add("journey.walkable", [...path, "screen"], `Step ${k + 1} of ${j.id} is on "${st.screen}", which is not a screen${current ? ` or a modal of "${current.screen}"` : ""}.`, "Name a screen ID, or modal:<id> for a modal of the screen the journey is on.");
          expected = undefined; current = null; return;
        }
        if (expected && key(expected) !== key(node) && on("journey.walkable")) {
          if (start.entering && k === 0) add("journey.walkable", path, `${j.id} enters on "${j.entry}", but its first step is on ${nameOf(node, screens)}.`, "Start the steps on the entry screen.");
          else add("journey.walkable", path, `Step ${k + 1} of ${j.id} is on ${nameOf(node, screens)}, but the step before leads to ${nameOf(expected, screens)}.`, "Make this step the screen or modal the previous action leads to, or change that action.");
        }
        if (node.kind === "screen" && current && current.kind === "screen" && current.screen !== node.screen) history.push(current.screen);
        current = node; expected = undefined;
        if (typeof st.action !== "string") {
          if (k < steps.length - 1 && on("journey.walkable")) add("journey.walkable", path, `Step ${k + 1} of ${j.id} takes no action, so nothing leads to step ${k + 2}.`, "Name the action this step takes.");
          return;
        }
        const found = actionsOf(node, screens).find(({ a }) => a.id === st.action);
        if (!found) {
          if (on("journey.walkable")) add("journey.walkable", [...path, "action"], `${nameOf(node, screens)} has no action "${st.action}" (step ${k + 1} of ${j.id}).`, `Name one of its actions: ${quoted(actionsOf(node, screens).map(({ a }) => a.id)) || "it has none; add them to its actions"}.`);
          return;
        }
        const sc = screens.get(node.screen), r = risk(found.a, sc.s);
        if (on("journey.safeguarded")) {
          if (r.destructive && (r.safeguard === "none" || r.safeguard == null)) add("journey.safeguarded", path, `"${found.a.label}" (step ${k + 1} of ${j.id}) is destructive with no safeguard.`, 'Set destructive to "undo" (an Undo toast) or "confirm".');
          if (r.highImpact && (r.approval === "none" || r.approval == null)) add("journey.safeguarded", path, `"${found.a.label}" (step ${k + 1} of ${j.id}) is high-impact with no approval.`, 'Set highImpact to "each" or "plan"; the user approves it, never the agent.');
        }
        const t = resolve(found.a.to, sc, screens);
        if (!t) return;
        if (t.kind === "screen" || t.kind === "modal") expected = t;
        else if (t.kind === "state") expected = node;
        else if (t.kind === "back") expected = node.kind === "modal" ? { kind: "screen", screen: node.screen } : history.length ? { kind: "screen", screen: history.pop() } : undefined;
        // Leaving the app ends the journey, or it resumes at its entry.
        else if (t.kind === "external") expected = entry ? { kind: "screen", screen: j.entry } : undefined;
      });
      return before;
    };

    const before = walk(j.steps, [...at, "steps"], { current: null, history: [], expected: entry ? { kind: "screen", screen: j.entry } : undefined, entering: true });

    const alts = list(j.alternates);
    alts.forEach((alt) => {
      const ap = [...at, "alternates", j.alternates.indexOf(alt)];
      const from = Number.isInteger(alt.from) ? j.steps[alt.from] : undefined;
      if (!from || typeof from !== "object") { if (on("journey.walkable") && Number.isInteger(alt.from)) add("journey.walkable", [...ap, "from"], `An alternate of ${j.id} branches at step ${alt.from + 1}, which it does not have.`, `Branch from a step index from 0 to ${j.steps.length - 1}.`); return; }
      if (!Array.isArray(alt.steps) || !alt.steps.length) return;
      // An alternate takes another way at the step it branches from: it starts on that step's screen or modal.
      const ctx = before[alt.from] ?? { current: null, history: [] };
      const first = alt.steps[0];
      if (on("journey.walkable") && first && first.screen !== from.screen) add("journey.walkable", [...ap, "steps", 0], `An alternate of ${j.id} branches at step ${alt.from + 1} on "${from.screen}", but starts on "${first.screen}".`, `Start the alternate on "${from.screen}".`);
      walk(alt.steps, [...ap, "steps"], { current: ctx.current, history: ctx.history, expected: undefined });
    });

    // journey.covers-errors: each screen on the path that declares an error
    // state has an alternate with a step on it in that state.
    if (on("journey.covers-errors")) {
      const onPath = [...new Set(steps.map((st) => st.screen).filter((id) => screens.get(id)?.s.states?.includes?.("error")))];
      for (const id of onPath) {
        const covered = alts.some((alt) => list(alt.steps).some((st) => st.screen === id && (st.state === "error" || st.expect === "error")));
        if (!covered) add("journey.covers-errors", at, `${j.id} passes "${screens.get(id).s.title ?? id}", which declares an error state, but no alternate covers it.`, `Add an alternate with a step on "${id}" in state "error" (and say how the user recovers).`);
      }
    }
  });

  // ------------------------------------------------- HELIX stories (JRN-03)
  // Read, never written: the caller passes the stories it read.
  if (helix && on("journey.story-covered")) {
    const stories = helix.stories ?? {};
    const journeyed = new Set(list(bp.journeys).map((j) => j.story));
    for (const sc of screens.values()) (Array.isArray(sc.s.stories) ? sc.s.stories : []).forEach((id, k) => {
      if (typeof id !== "string") return;
      if (!stories[id]) add("journey.story-covered", [...sc.at, "stories", k], `"${sc.s.title ?? sc.s.id}" serves ${id}, which is not a HELIX story.`, "Name a story in the HELIX flow, or remove it.");
      else if (!journeyed.has(id)) add("journey.story-covered", [...sc.at, "stories", k], `${id}, which "${sc.s.title ?? sc.s.id}" serves, has no journey.`, `Add a journey for ${id} to journeys, with the criteria its steps exercise.`);
    });
    list(bp.journeys).forEach((j) => {
      const at = ["journeys", bp.journeys.indexOf(j)];
      if (typeof j.story !== "string") return;
      const story = stories[j.story];
      if (!story) { add("journey.story-covered", [...at, "story"], `${j.id} is for ${j.story}, which is not a HELIX story.`, "Name a story in the HELIX flow."); return; }
      (Array.isArray(j.criteria) ? j.criteria : []).forEach((c, k) => {
        if (typeof c === "string" && c.startsWith(`${j.story}-AC`) && !story.criteria.includes(c)) add("journey.story-covered", [...at, "criteria", k], `${j.id} names ${c}, which ${j.story} does not have.`, `Name one of ${j.story}'s criteria: ${story.criteria.join(", ") || "it has none"}.`);
      });
    });
  }
}
