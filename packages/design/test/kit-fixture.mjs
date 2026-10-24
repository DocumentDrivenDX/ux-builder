/* A test kit's app, shared by the test-kit, session and report tests:
   a blueprint, two HELIX stories and a brief naming its target users. */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tempApp } from "./helpers.mjs";

const put = (app, path, text) => { mkdirSync(join(app, path, ".."), { recursive: true }); writeFileSync(join(app, path), text); };
const st = ["empty", "loading", "error"];
export const KIT_BP = {
  version: 1, kind: "app", name: "rivers", supports: { sizeClasses: ["compact"], inputs: ["coarse"] },
  destinations: [{ id: "find", label: "Find", screen: "map" }, { id: "saved", label: "Saved", screen: "saved" }],
  screens: [
    { id: "map", title: "River map", pattern: "CollectionList", states: st, actions: [{ id: "open", label: "Open river details", to: "detail", primary: true }] },
    { id: "detail", title: "River details", pattern: "RecordDetail", states: st, actions: [{ id: "save", label: "Save river", to: "state:saved" }] },
    { id: "saved", title: "Saved", pattern: "CollectionList", states: st, actions: [{ id: "open", label: "Open river details", to: "detail" }] },
  ],
  tasks: [{ id: "T-1", goal: "Find a river to fish this weekend on the River map", jobs: ["J-1"] }, { id: "T-2", goal: "Go back to a river you saved", jobs: ["J-2"] }],
  journeys: [
    { id: "J-find", story: "US-001", task: "T-1", criteria: ["US-001-AC1", "US-001-AC2"], entry: "map", steps: [{ screen: "map", action: "open" }, { screen: "detail", action: "save" }] },
    { id: "J-saved", story: "US-002", task: "T-2", entry: "saved", steps: [{ screen: "saved", action: "open" }, { screen: "detail" }] },
  ],
};
export function kitApp() {
  const a = tempApp();
  writeFileSync(join(a, "app.blueprint.json"), JSON.stringify(KIT_BP, null, 2));
  writeFileSync(join(a, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
  put(a, "docs/helix/01-frame/user-stories/US-001-find.md", "---\nddx:\n  id: US-001\n  type: user-stories\n---\n\n# US-001: Find a river\n\n- [ ] **US-001-AC1** — Given rivers nearby, when the angler looks, then they find one with access.\n- [ ] **US-001-AC2** — Given a river, when the angler saves it, then it is in Saved.\n");
  put(a, "docs/helix/01-frame/user-stories/US-002-saved.md", "---\nddx:\n  id: US-002\n  type: user-stories\n---\n\n# US-002: Saved rivers\n");
  put(a, "docs/ux/jobs.md", "---\nux:\n  id: jobs\n  type: jobs\n---\n\n# Jobs\n\n## Jobs\n\n| ID | Job | Importance | Evidence | Confidence | Status |\n|---|---|---|---|---|---|\n| J-1 | Find a river | high | none | low | hypothesis |\n| J-2 | Go back to a river | medium | none | low | hypothesis |\n");
  put(a, "docs/ux/brief.md", "---\nux:\n  id: brief\n  type: experience-brief\n---\n\n# Experience brief\n\n## Product\n\n- River finder.\n\n## Target users\n\n- Weekend anglers new to the area [assumed]\n- Fly-fishing guides\n\n## Primary outcome\n\n- Find water fast.\n\n## Primary jobs\n\n- None yet.\n\n## Experience principles\n\n- None yet.\n\n## Constraints\n\n- None yet.\n\n## Open questions\n\n- None yet.\n");
  return a;
}

/* Five sessions of TK-1: task 1 (J-find) and task 2 (J-saved). */
export const SHEET = [
  "participant,task,completed,seconds,errors,assists,remark,problem",
  "P1,1,yes,95,0,0,Found it on the map quickly,",
  "P1,2,yes,40,1,0,Tapped Saved twice,",
  "P2,1,no,240,2,1,Could not tell which access point was public,access points unclear",
  "P2,2,yes,35,0,0,,",
  "P3,1,yes,180,1,1,\"Asked where the access is, then found it\",access points unclear",
  "P3,2,yes,30,0,0,,",
  "P4,1,yes,120,0,0,,",
  "P5,1,no,300,3,2,Gave up looking for parking,access points unclear",
  "P5,2,no,90,1,1,Did not find the saved list,saved list hidden",
].join("\n") + "\n";
