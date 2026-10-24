/* The task model (FEAT-018 GDL-22 to GDL-24; CONTRACT-005 as amended by
   CONTRACT-008): checks that tie tasks to journeys, and simplify, which
   proposes ways to make a task take less of its user. Pure functions of
   the blueprint, in blueprint order, so the same blueprint gives the same
   result. Internal to @ux-builder/ui/blueprint. */

const list = (x) => (Array.isArray(x) ? x : []);
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/* journey.task-exists and task.realized. */
export function checkTasks(bp, { add, on }) {
  const tasks = list(bp?.tasks).filter((t) => t && typeof t === "object");
  const ids = new Set(tasks.map((t) => t.id).filter(Boolean));
  const realized = new Set();
  list(bp?.journeys).forEach((j, i) => {
    if (!j?.task) return;
    realized.add(j.task);
    if (on("journey.task-exists") && !ids.has(j.task)) add("journey.task-exists", ["journeys", i, "task"], `${j.id ?? `Journey ${i}`} realizes ${j.task}, which is not one of the blueprint's tasks.`, ids.size ? `Name one of ${[...ids].join(", ")}, or add ${j.task} to tasks.` : `Add ${j.task} to tasks.`);
  });
  tasks.forEach((t, i) => {
    if (t.id && on("task.realized") && !realized.has(t.id)) add("task.realized", ["tasks", i], `${t.id} ("${t.goal ?? ""}") is realized by no journey.`, `Add a journey with "task": "${t.id}", or remove the task.`);
  });
}

/* Proposals that make a task take less: [{ task, journey?, kind, at, change, saves, assumes }]. */
export function simplify(bp) {
  const tasks = list(bp?.tasks).filter((t) => t?.id);
  if (!tasks.length) return { proposals: [], message: "There is no task model to simplify: the blueprint has no tasks." };
  const screens = new Map(list(bp?.screens).filter((s) => s?.id).map((s) => [s.id, s]));
  const destinationOf = new Map(list(bp?.destinations).map((d) => [d.screen, d.id]));
  const proposals = [];
  const saves = (steps = 0, inputs = 0, decisions = 0) => ({ steps, inputs, decisions });

  for (const t of tasks) {
    // An input another task's system action already produces can be inferred.
    for (const input of list(t.inputs?.required)) {
      const by = tasks.find((o) => o !== t && list(o.systemActions).some((a) => norm(a).includes(norm(input))));
      if (by) proposals.push({ task: t.id, kind: "infer-input", at: `tasks/${t.id}/inputs/required/${input}`, change: `Move "${input}" to inputs.optional: ${by.id}'s system action "${list(by.systemActions).find((a) => norm(a).includes(norm(input)))}" already produces it.`, saves: saves(0, 1, 0), assumes: `What ${by.id} produces is available when ${t.id} runs, and is right for it.` });
    }
    for (const j of list(bp?.journeys).filter((x) => x?.task === t.id)) {
      const steps = list(j.steps).filter((s) => s?.screen);
      steps.forEach((s, i) => {
        const next = steps[i + 1];
        // Two steps on one screen with no decision between them can be one.
        if (next && next.screen === s.screen && !s.decision && !next.decision) {
          proposals.push({ task: t.id, journey: j.id, kind: "combine-steps", at: `journeys/${j.id}/steps/${i}`, change: `Combine steps ${i} and ${i + 1} on ${s.screen} into one interaction.`, saves: saves(1, 0, 0), assumes: `Nothing the user learns at step ${i} changes what they do at step ${i + 1}.` });
        }
        // A decision with only one way forward needs a default, not a question.
        const actions = list(screens.get(s.screen)?.actions);
        if (s.decision && actions.length <= 1) {
          proposals.push({ task: t.id, journey: j.id, kind: "default-decision", at: `journeys/${j.id}/steps/${i}`, change: `Default "${s.decision}" on ${s.screen}${actions[0] ? ` to "${actions[0].label ?? actions[0].id}"` : ""} and let the user change it, instead of asking.`, saves: saves(0, 0, 1), assumes: "Most users would make the default choice." });
        }
        // Going to another screen and straight back is a hop the user does not need.
        const after = steps[i + 2];
        if (next && after && after.screen === s.screen && next.screen !== s.screen && !next.decision && !list(next.inputs?.required).length) {
          const dest = destinationOf.get(next.screen);
          proposals.push({ task: t.id, journey: j.id, kind: "remove-hop", at: `journeys/${j.id}/steps/${i + 1}`, change: `Show what ${next.screen}${dest ? ` (destination ${dest})` : ""} offers on ${s.screen}, so the user does not leave and come back.`, saves: saves(2, 0, 0), assumes: `What the user gets from ${next.screen} fits on ${s.screen}.` });
        }
      });
    }
  }
  const order = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  proposals.sort((a, b) => order(a.task, b.task) || order(a.journey ?? "", b.journey ?? "") || order(a.at, b.at) || order(a.kind, b.kind));
  return { proposals, message: proposals.length ? `${proposals.length} proposal${proposals.length === 1 ? "" : "s"}; nothing is changed until the person accepts one.` : "No simplification found." };
}
