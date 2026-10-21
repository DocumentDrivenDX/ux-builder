/* The rules check (FEAT-008 PRV-01 to PRV-03; US-050-AC4).

     npm test */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkRules, known, NOTICES } from "../check-rules.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
let k;
before(async () => { k = await known(); });
const text = (p) => readFileSync(join(ROOT, p), "utf8");
const sources = () => ({ rules: read("guidelines/rules.json"), recipes: read("guidelines/recipes.json"), notices: text(NOTICES) });
const CREDITED = text("tools/__tests__/fixtures/notices-crediting-android.md");
const androidQuote = { title: "Android Developers", url: "https://developer.android.com/", licence: "CC-BY-2.5", wording: "quoted", quote: "A short attributed line." };

describe("US-050-AC4: the rules check enforces provenance", () => {
  test("the shipped rules and recipes pass", () => {
    assert.deepEqual(checkRules(sources(), k), []);
    const r = spawnSync(process.execPath, [join(ROOT, "tools/check-rules.mjs")], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
  });

  // @covers US-050-AC4
  test("no source, a proprietary quote, a long quote and an unknown check each fail, naming the rule", () => {
    const s = sources();
    const [a, b, c, d] = s.rules.rules;
    a.sources = [];
    b.sources = [{ ...b.sources.find((x) => x.licence === "apple-terms" || x.licence === "google-terms") ?? { title: "Apple HIG", url: "https://developer.apple.com/", licence: "apple-terms" }, wording: "quoted", quote: "Some words." }];
    c.sources = [{ title: "WCAG 2.2", url: "https://www.w3.org/TR/WCAG22/", licence: "W3C", wording: "quoted", quote: Array(26).fill("word").join(" ") }];
    d.checks = [{ kind: "audit", id: "no-such-check" }];
    const problems = checkRules(s, k);
    assert.ok(problems.some((p) => p.includes(`rule ${a.id}: cites no source`)), problems.join("\n"));
    assert.ok(problems.some((p) => p.startsWith(`rule ${b.id}: quotes`) && /does not allow it/.test(p)), problems.join("\n"));
    assert.ok(problems.some((p) => p.startsWith(`rule ${c.id}: quotes 26 words`)), problems.join("\n"));
    assert.ok(problems.some((p) => p.includes(`rule ${d.id}: names the audit check "no-such-check"`)), problems.join("\n"));
  });

  // @covers US-050-AC6
  test("a short, credited quote from an open source is allowed; recipes must name real patterns and rules", () => {
    const s = { ...sources(), notices: CREDITED };
    s.rules.rules[0].sources.push({ ...androidQuote });
    assert.deepEqual(checkRules(s, k), []);
    s.recipes.recipes[0].screens.push({ pattern: "Nope", role: "x" });
    s.recipes.recipes[0].rules.push("no.such-rule");
    const problems = checkRules(s, k);
    assert.equal(problems.length, 2, problems.join("\n"));
  });
});

describe("US-076-AC4: the AI sources' licences (FEAT-011 AIP-01, AIP-03)", () => {
  const mslOnly = { title: "Microsoft Learn: Human-centered design for agents", url: "https://learn.microsoft.com/en-us/agents/design-guidelines/human-centered-design", licence: "microsoft-terms", wording: "paraphrased" };

  // @covers US-076-AC4
  test("only CC-BY-4.0 of the new licences may be quoted; Microsoft terms, PAIR and the paper are paraphrased", () => {
    const s = { ...sources(), notices: "Credits: Microsoft Teams: Designing Adaptive Cards (CC BY 4.0)" };
    const r = s.rules.rules.find((x) => x.id === "card.wrap");
    r.sources.push({ title: "Microsoft Teams: Designing Adaptive Cards", url: "https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/design-effective-cards", licence: "CC-BY-4.0", wording: "quoted", quote: "A short attributed line." });
    assert.deepEqual(checkRules(s, k), []);
    for (const licence of ["microsoft-terms", "CC-BY-NC-SA-4.0", "CC-BY-NC-ND-4.0"]) {
      const t = sources();
      const x = t.rules.rules.find((y) => y.id === "ai.disclose");
      x.sources = [{ title: "Some source", url: "https://example.com/", licence, wording: "quoted", quote: "Some words." }];
      assert.ok(checkRules(t, k).some((p) => p.startsWith("rule ai.disclose: quotes") && /does not allow it/.test(p)), licence);
    }
  });

  // @covers US-076-AC4
  test("Microsoft Learn's preview agent pages are never a rule's only source; a card check must exist", () => {
    const s = sources();
    const r = s.rules.rules.find((x) => x.id === "ai.user-initiates");
    r.sources = [mslOnly];
    const c = s.rules.rules.find((x) => x.id === "card.wrap");
    c.checks = [{ kind: "card", id: "card.wrap" }];
    const problems = checkRules(s, k);
    assert.ok(problems.includes("rule ai.user-initiates: cites only Microsoft Learn's preview agent pages; add a primary source"), problems.join("\n"));
    assert.ok(problems.includes('rule card.wrap: names the card check "card.wrap", which does not exist'), problems.join("\n"));
    assert.equal(problems.length, 2, problems.join("\n"));
  });
});

describe("US-050-AC6: a quoted source is credited in the shipped notices", () => {
  // @covers US-050-AC6
  test("a quote the notices do not credit fails, naming the rule and the source", () => {
    const s = sources();
    const r = s.rules.rules[1];
    r.sources.push({ ...androidQuote });
    const problems = checkRules(s, k);
    assert.deepEqual(problems, [`rule ${r.id}: quotes "Android Developers", which ${NOTICES} does not credit; add it to the notices`]);
  });

  // @covers US-050-AC6
  test("a credit by URL alone, or by title alone, is enough; a paraphrased source needs none", () => {
    const s = sources();
    s.rules.rules[1].sources.push({ ...androidQuote });
    assert.deepEqual(checkRules({ ...s, notices: "Credits: https://developer.android.com/ (CC BY 2.5)" }, k), []);
    assert.deepEqual(checkRules({ ...s, notices: "Credits: Android Developers (CC BY 2.5)" }, k), []);
    assert.deepEqual(checkRules({ ...sources(), notices: "" }, k), [], "no rule quotes today, so empty notices pass");
  });
});
