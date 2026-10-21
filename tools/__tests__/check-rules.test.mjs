/* The rules check (FEAT-008 PRV-01 to PRV-03; US-050-AC4).

     npm test */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkRules, known } from "../check-rules.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
let k;
before(async () => { k = await known(); });
const sources = () => ({ rules: read("guidelines/rules.json"), recipes: read("guidelines/recipes.json") });

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

  test("a short quote from an open source is allowed; recipes must name real patterns and rules", () => {
    const s = sources();
    s.rules.rules[0].sources.push({ title: "Android Developers", url: "https://developer.android.com/", licence: "CC-BY-2.5", wording: "quoted", quote: "A short attributed line." });
    assert.deepEqual(checkRules(s, k), []);
    s.recipes.recipes[0].screens.push({ pattern: "Nope", role: "x" });
    s.recipes.recipes[0].rules.push("no.such-rule");
    const problems = checkRules(s, k);
    assert.equal(problems.length, 2, problems.join("\n"));
  });
});
