/* The modalities choose the rules (FEAT-014 MOD-06, MOD-07; US-098;
   CONTRACT-005 Modalities and theme rules).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { checkBlueprint, modalitiesOf, rulesFor, skeleton } from "@ux-builder/ui/blueprint";
import { MODALITIES, expandModalities } from "@ux-builder/ui/blueprint/modalities";

const source = JSON.parse(readFileSync(new URL("../../../guidelines/rules.json", import.meta.url), "utf8"));
const ids = (target) => rulesFor(target).map((r) => r.id);
const family = (id) => id.split(".")[0];
const AI = /^(ai|agent|genui|card)\./;

describe("US-098: the modalities choose the rules and components", () => {
  // @covers US-098-AC1
  test("AC1: chat gives the assistant AI rules and the feedback, input and text rules; no nav.* and no card.*", () => {
    const got = ids({ modalities: ["chat"] });
    const assistant = source.rules.filter((r) => family(r.id) === "ai" && (!r.when?.aiRole || r.when.aiRole.includes("assistant"))).map((r) => r.id);
    for (const id of assistant) assert.ok(got.includes(id), id);
    for (const f of ["feedback", "input", "text"]) for (const r of source.rules.filter((x) => family(x.id) === f)) assert.ok(got.includes(r.id), r.id);
    assert.deepEqual(got.filter((id) => /^(nav|card|genui|agent)\./.test(id)), []);
    assert.ok(!got.includes("ai.fallback"), "a generative-only rule is not the assistant's");
  });

  // @covers US-098-AC2
  test("AC2: hybrid-chat includes the card.* and genui.* rules", () => {
    const got = ids({ modalities: ["hybrid-chat"] });
    for (const r of source.rules.filter((x) => /^(card|genui)\./.test(x.id) && (!x.when?.aiRole || x.when.aiRole.includes("assistant")))) assert.ok(got.includes(r.id), r.id);
    assert.ok(got.some((id) => id.startsWith("card.")) && got.some((id) => id.startsWith("genui.")));
    assert.ok(source.rules.filter((r) => r.id.startsWith("card.")).every((r) => r.when?.modality?.join() === "hybrid-chat"), "every card.* rule carries when.modality: [hybrid-chat]");
    assert.ok(!ids({ modalities: ["chat"], aiRoles: ["assistant"] }).some((id) => id.startsWith("card.")), "card.* stays hybrid-chat's even with the assistant role");
  });

  // @covers US-098-AC3
  test("AC3: responsive-web gives every app rule for compact to large and coarse and fine input, and no AI rule", () => {
    const got = ids({ context: "app", modalities: ["responsive-web"] });
    const expected = ids({ context: "app", sizeClasses: ["compact", "medium", "expanded", "large"], inputs: ["coarse", "fine"] }).filter((id) => !AI.test(id));
    assert.deepEqual(got, expected);
    assert.ok(got.includes("nav.compact-destinations") && got.includes("nav.standing-at-expanded") && got.includes("input.touch-targets") && got.includes("input.focus-visible"));
    assert.deepEqual(got.filter((id) => AI.test(id)), []);
  });

  test("a combination is the union; without modalities, when.modality is not read (callers before FEAT-014)", () => {
    const both = new Set(ids({ modalities: ["responsive-web", "hybrid-chat"] }));
    for (const id of [...ids({ modalities: ["responsive-web"] }), ...ids({ modalities: ["hybrid-chat"] })]) assert.ok(both.has(id), id);
    assert.ok(ids({ aiRoles: ["assistant"] }).some((id) => id.startsWith("card.")));
    assert.deepEqual(expandModalities(["chat", "responsive-web"]).sizeClasses, MODALITIES["responsive-web"].sizeClasses);
  });

  // @covers US-098-AC4
  test("AC4: a blueprint whose sizeClasses or inputs miss what its modalities derive warns, naming the missing ones", () => {
    const bp = { ...skeleton("app"), supports: { modalities: ["responsive-web"], sizeClasses: ["compact", "medium"], inputs: ["fine"] } };
    const f = checkBlueprint(bp).filter((x) => x.rule === "blueprint.valid");
    assert.deepEqual(f.map((x) => [x.severity, x.path]), [["warning", "/supports/inputs"], ["warning", "/supports/sizeClasses"]]);
    assert.match(f.find((x) => x.path === "/supports/sizeClasses").message, /"expanded", "large"/);
    assert.match(f.find((x) => x.path === "/supports/inputs").message, /"coarse"/);
    const fine = { ...skeleton("app"), supports: { modalities: ["responsive-web", "chat"], sizeClasses: ["compact", "medium", "expanded", "large"], inputs: ["coarse", "fine"] } };
    assert.deepEqual(checkBlueprint(fine), []);
  });

  test("a future modality fails blueprint.valid as future; an unknown one is named; none reads as responsive-web", () => {
    const at = (m) => checkBlueprint({ ...skeleton("app"), supports: { ...skeleton("app").supports, modalities: m } }).filter((x) => x.severity === "error");
    const ios = at(["ios"]);
    assert.equal(ios.length, 1);
    assert.equal(ios[0].path, "/supports/modalities/0");
    assert.match(ios[0].message, /"ios" is a future modality[\s\S]*Available now: responsive-web, chat, hybrid-chat/);
    assert.match(at(["kiosk"])[0].message, /"kiosk" is not a modality/);
    assert.match(at([])[0].message, /at least 1 item/);
    assert.deepEqual(modalitiesOf(skeleton("app")), ["responsive-web"]);
    assert.deepEqual(modalitiesOf({ supports: { modalities: ["chat"] } }), ["chat"]);
  });

  test("screens[].path is a URL path, and a chat screen may name Conversation as its pattern", () => {
    const bp = { ...skeleton("app"), supports: { modalities: ["chat"], sizeClasses: ["compact", "medium", "expanded"], inputs: ["coarse", "fine"] }, destinations: [{ id: "assistant", label: "Assistant", screen: "assistant" }],
      screens: [{ id: "assistant", title: "Assistant", pattern: "Conversation", path: "/", ai: { roles: ["assistant"], essential: true } }] };
    assert.deepEqual(checkBlueprint(bp), []);
    const bad = checkBlueprint({ ...bp, screens: [{ ...bp.screens[0], path: "review" }] });
    assert.deepEqual(bad.map((x) => x.path), ["/screens/0/path"]);
  });

  // @covers US-098-AC5
  test("AC5: the guidance names, for each modality, the components to build with and the rule families", () => {
    for (const file of ["../AGENTS.md", "../skill/ux-builder-ui/SKILL.md"]) {
      const text = readFileSync(new URL(file, import.meta.url), "utf8");
      const section = text.slice(text.indexOf("### Modalities"), text.indexOf("### Interaction and screen rules"));
      for (const [name, m] of Object.entries(MODALITIES)) {
        const row = section.split("\n").find((l) => l.startsWith(`| \`${name}\` |`));
        assert.ok(row, `${file}: ${name}`);
        for (const c of m.components) assert.ok(row.includes(`\`${c}\``), `${name}: ${c}`);
        for (const f of m.ruleFamilies) assert.ok(row.includes(`\`${f}.*\``), `${name}: ${f}`);
      }
    }
  });
});
