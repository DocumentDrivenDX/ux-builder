/* checkCard and the vendored schema (US-084, US-085-AC6; ADR-029, SD-005
   card rules, CONTRACT-004 Adaptive Cards), in Node.

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { CHECKS, cardSchema, checkCard } from "../adaptive-cards/check.mjs";
import * as entry from "../dist/adaptive-cards.js";
import { CLEAN, COLUMNS, DESTRUCTIVE, EVERY_ELEMENT, MARKUP, NEWER, PAY_INVOICE } from "../src/adaptive-cards/story-data.js";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const ROOT = join(PKG, "../..");
const SAMPLES = join(PKG, "test/fixtures/adaptive-cards/samples");
const sample = (f) => JSON.parse(readFileSync(join(SAMPLES, f), "utf8"));
const card = (body, extra = {}) => ({ type: "AdaptiveCard", version: "1.6", body: [{ type: "TextBlock", text: "Title", style: "heading", wrap: true }, ...body], ...extra });
const rules = (fs) => fs.map((f) => f.rule);
const at = (fs, rule) => fs.filter((f) => f.rule === rule).map((f) => f.path);

describe("the vendored Adaptive Cards 1.6 schema", () => {
  test("is draft-06 JSON Schema data whose every $ref resolves, defining every 1.6 element", () => {
    assert.equal(cardSchema.$schema, "http://json-schema.org/draft-06/schema#");
    assert.equal(cardSchema.id, "http://adaptivecards.io/schemas/adaptive-card.json");
    const refs = [];
    (function walk(v) { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") { if (typeof v.$ref === "string") refs.push(v.$ref); Object.values(v).forEach(walk); } })(cardSchema);
    assert.ok(refs.length > 100);
    for (const r of refs) assert.ok(r.startsWith("#/definitions/") && cardSchema.definitions[r.slice(14)], r);
    for (const t of ["AdaptiveCard", "TextBlock", "RichTextBlock", "TextRun", "Image", "ImageSet", "Media", "Container", "ColumnSet", "Column", "FactSet", "Table", "TableRow", "TableCell", "ActionSet",
      "Input.Text", "Input.Number", "Input.Date", "Input.Time", "Input.Toggle", "Input.ChoiceSet", "Action.Submit", "Action.Execute", "Action.OpenUrl", "Action.ShowCard", "Action.ToggleVisibility"]) assert.ok(cardSchema.definitions[t], t);
    const licence = JSON.parse(readFileSync(join(PKG, "licenses/vendored.json"), "utf8")).vendored.find((v) => v.files.includes("adaptive-cards/schema-1.6/adaptive-card.json"));
    assert.equal(licence.licence, "MIT");
    assert.match(readFileSync(join(PKG, licence.licenceFile), "utf8"), /Copyright \(c\) 2017 Microsoft/);
  });

  test("the entry exports AdaptiveCard, checkCard and cardSchema, and the same check as the Node module", () => {
    assert.equal(typeof entry.AdaptiveCard, "function");
    assert.deepEqual(entry.checkCard(PAY_INVOICE), checkCard(PAY_INVOICE));
    assert.deepEqual(entry.CHECKS, CHECKS);
    assert.deepEqual(entry.cardSchema, cardSchema);
  });

  test("every card rule with an automatic check in SD-005 is a card check in rules.json, and the review stand-ins are gone", () => {
    const sd = readFileSync(join(ROOT, "docs/helix/02-design/solution-designs/SD-005-ai-and-agent-experience-rules.md"), "utf8");
    const rows = [...sd.matchAll(/^\| `(card\.[a-z-]+)` \|[^|]*\|[^|]*\| ([A-Za-z, ]+) \|/gm)].map(([, id, checks]) => ({ id, checks: checks.split(",").map((x) => x.trim()) }));
    assert.equal(rows.length, 15);
    const automatic = rows.filter((r) => r.checks.includes("C")).map((r) => r.id).sort();
    assert.deepEqual([...CHECKS].sort(), automatic);
    const rulesJson = JSON.parse(readFileSync(join(ROOT, "guidelines/rules.json"), "utf8")).rules;
    for (const row of rows) {
      const kinds = rulesJson.find((r) => r.id === row.id).checks.map((c) => `${c.kind}:${c.id}`);
      assert.equal(kinds.includes(`card:${row.id}`), row.checks.includes("C"), row.id);
      assert.equal(kinds.includes(`review:${row.id}`), row.checks.includes("R") || !row.checks.includes("C"), `${row.id}: a review check only where SD-005 lists R, or nothing automatic`);
    }
  });
});

describe("US-084: check an Adaptive Card before it is sent", () => {
  // @covers US-084-AC1
  test("AC1: a card that fails the schema gets an error naming the path, and no rule runs on the invalid part", () => {
    const bad = card([
      { type: "TextBlock", text: "Bad", wrap: "yes" },
      { type: "Container", style: "loud", items: [{ type: "Image", url: "https://example.com/a.png" }] },
      { type: "TextBlock", text: "Fine, but cut off" },
    ]);
    const f = checkCard(bad);
    const errors = f.filter((x) => x.severity === "error");
    assert.deepEqual(errors.map((x) => [x.rule, x.path]), [["card.version", "/body/1/wrap"], ["card.version", "/body/2/style"]]);
    assert.match(errors[0].message, /must be a boolean/);
    assert.match(errors[1].message, /"loud".*one of "default", "emphasis"/);
    assert.deepEqual(at(f, "card.wrap"), ["/body/3"], "the invalid TextBlock is not checked; the valid one is");
    assert.deepEqual(at(f, "card.image-alt"), [], "nothing inside the invalid Container is checked");
    // Valid JSON that is not a card: one schema finding.
    for (const x of [{ type: "Message", text: "hi" }, [], "card", null]) {
      const g = checkCard(x);
      assert.equal(g.length, 1, JSON.stringify(x));
      assert.deepEqual([g[0].rule, g[0].severity], ["card.version", "error"]);
    }
    assert.equal(checkCard({ type: "Message" })[0].path, "/type");
    // A version above 1.6, and an element outside 1.6 with no fallback.
    const newer = checkCard({ ...card([{ type: "Carousel", pages: [] }]), version: "1.7" });
    assert.deepEqual(newer.filter((x) => x.rule === "card.version").map((x) => [x.path, x.severity]), [["/body/1", "warning"], ["/version", "warning"]]);
    assert.deepEqual(checkCard(Object.fromEntries(Object.entries(CLEAN).filter(([k]) => k !== "version"))).map((x) => [x.rule, x.path]), [["card.version", ""]]);
  });

  // @covers US-084-AC2
  test("AC2: more than six primary actions warn card.actions-few, on the card and on an ActionSet", () => {
    const seven = Array.from({ length: 7 }, (_, i) => ({ type: "Action.Submit", title: `Choose plan ${i + 1}` }));
    assert.deepEqual(at(checkCard(card([], { actions: seven })), "card.actions-few"), ["/actions"]);
    assert.deepEqual(at(checkCard(card([{ type: "ActionSet", actions: seven }])), "card.actions-few"), ["/body/1/actions"]);
    assert.deepEqual(at(checkCard(card([], { actions: seven.slice(0, 6) })), "card.actions-few"), []);
    // Secondary actions are in the overflow menu, not primary.
    assert.deepEqual(at(checkCard(card([], { actions: seven.map((a, i) => (i > 3 ? { ...a, mode: "secondary" } : a)) })), "card.actions-few"), []);
    assert.equal(checkCard(card([], { actions: seven })).find((f) => f.rule === "card.actions-few").severity, "warning");
  });

  // @covers US-084-AC3
  test("AC3: an input with no label, or a validated input with no errorMessage, warns with the input's path", () => {
    const f = checkCard(card([
      { type: "Input.Text", id: "q", placeholder: "Quantity" },
      { type: "Input.Number", id: "n", label: "Amount", min: 1 },
      { type: "Input.Date", id: "d", label: "Date", isRequired: true, errorMessage: "Choose a date." },
      { type: "Input.Text", id: "e", label: "Email", regex: "^\\S+@\\S+$" },
    ]));
    assert.deepEqual(at(f, "card.input-label"), ["/body/1"]);
    assert.match(f.find((x) => x.rule === "card.input-label").message, /placeholder disappears/);
    assert.deepEqual(at(f, "card.input-error"), ["/body/2", "/body/4"]);
    assert.match(f.find((x) => x.rule === "card.input-error").fix, /errorMessage/);
  });

  // @covers US-084-AC4
  test("AC4: unwrapped text and choices, many or wide columns, images without altText and hidden validated inputs warn", () => {
    const f = checkCard(card([
      { type: "TextBlock", text: "Not wrapped" },
      { type: "Input.ChoiceSet", id: "c", label: "Choice", choices: [{ title: "A", value: "a" }] },
      { type: "ColumnSet", columns: [1, 2, 3, 4].map(() => ({ type: "Column", items: [] })) },
      { type: "ColumnSet", columns: [{ type: "Column", width: "200px", items: [] }, { type: "Column", width: "150px", items: [] }] },
      { type: "ColumnSet", columns: [{ type: "Column", width: "auto", items: [] }, { type: "Column", width: "100px", items: [] }] },
      { type: "Image", url: "https://example.com/a.png" },
      { type: "Container", isVisible: false, items: [{ type: "Input.Text", id: "h", label: "Hidden", isRequired: true, errorMessage: "Enter it." }] },
      { type: "Input.Text", id: "h2", label: "Optional hidden", isVisible: false },
    ]));
    assert.deepEqual(at(f, "card.wrap"), ["/body/1", "/body/2"]);
    assert.deepEqual(at(f, "card.columns-few"), ["/body/3", "/body/4"]);
    assert.match(f.find((x) => x.path === "/body/4").message, /350px/);
    assert.deepEqual(at(f, "card.image-alt"), ["/body/6"]);
    assert.deepEqual(at(f, "card.no-hidden-inputs"), ["/body/7/items/0"], "a hidden input that does not validate is not flagged");
  });

  // @covers US-084-AC5
  test('AC5: an action titled only "Click here" or "Submit" warns card.action-titles', () => {
    const f = checkCard(card([], { actions: [
      { type: "Action.OpenUrl", title: "Click here", url: "https://example.com" },
      { type: "Action.Submit", title: "Submit" },
      { type: "Action.Submit", title: "OK", tooltip: "Save the booking and close" },
      { type: "Action.Submit", title: "Submit expense" },
    ] }));
    assert.deepEqual(at(f, "card.action-titles"), ["/actions/0", "/actions/1"]);
  });

  // @covers US-084-AC7
  test("AC7: a clean 1.6 sample card returns no findings", () => {
    assert.deepEqual(checkCard(CLEAN), []);
    assert.deepEqual(checkCard(PAY_INVOICE), []);
    for (const f of ["v1.5-Scenarios-FlightItinerary.json", "v1.5-Scenarios-Agenda.json", "v1.5-Scenarios-ImageGallery.json", "v1.5-Scenarios-OrderConfirmation.json", "v1.5-Scenarios-Restaurant.json",
      "v1.5-Scenarios-StockUpdate.json", "v1.5-Elements-TextBlock.Style.json", "v1.6-Elements-Media.json", "v1.6-Scenarios-ProductVideo.json"]) assert.deepEqual(checkCard(sample(f)), [], f);
  });

  test("every official sample passes, or fails with the rules expected of it (SD-005 Testing)", () => {
    const expected = {
      "v1.0-Elements-TextBlock.Markdown.json": ["card.heading", "card.wrap"],
      "v1.2-Elements-Action.Submit.Style.json": ["card.heading", "card.version"],
      "v1.2-Elements-Action.ToggleVisibility.json": ["card.heading", "card.wrap"],
      "v1.2-Elements-ActionFallback.json": ["card.heading", "card.version", "card.wrap"],
      "v1.2-Elements-Column.Fallback.json": ["card.version", "card.wrap"],
      "v1.2-Elements-Container.Style.json": ["card.heading", "card.wrap"],
      "v1.2-Elements-RichTextBlock.json": ["card.heading"],
      "v1.5-Elements-Action.Execute.Mode.json": ["card.high-impact-marked"],
      "v1.5-Elements-Input.ChoiceSet.Filtered.json": ["card.action-titles", "card.heading", "card.wrap"],
      "v1.5-Elements-Table.json": ["card.heading", "card.version"],
      "v1.5-Scenarios-ActivityUpdate.json": ["card.action-titles", "card.high-impact-marked"],
      "v1.5-Scenarios-CalendarReminder.json": ["card.wrap"],
      "v1.5-Scenarios-ExpenseReport.json": ["card.action-titles", "card.high-impact-marked", "card.version"],
      "v1.5-Scenarios-FlightUpdateTable.json": ["card.version"],
      "v1.5-Scenarios-FoodOrder.json": ["card.action-titles", "card.wrap"],
      "v1.5-Scenarios-InputForm.json": ["card.action-titles"],
      "v1.5-Scenarios-InputsWithValidation.json": ["card.action-titles", "card.version", "card.wrap"],
      "v1.5-Scenarios-ShowCardWizard.json": ["card.action-titles"],
      "v1.5-Scenarios-WeatherLarge.json": ["card.columns-few"],
      "v1.6-Elements-Carousel.json": ["card.heading", "card.version"],
    };
    const files = readdirSync(SAMPLES).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 10);
    for (const f of files) assert.deepEqual([...new Set(rules(checkCard(sample(f))))].sort(), expected[f] ?? [], f);
    // Their schema failures are real: properties that are not in schema 1.6.
    assert.match(checkCard(sample("v1.5-Elements-Table.json")).find((x) => x.severity === "error").message, /firstRowAsHeaders/);
  });

  test("findings have the CONTRACT-005 shape, ordered by path then rule, and the check is deterministic", () => {
    for (const c of [EVERY_ELEMENT, MARKUP, NEWER, DESTRUCTIVE, COLUMNS, ...readdirSync(SAMPLES).filter((f) => f.endsWith(".json")).map(sample)]) {
      const f = checkCard(c);
      for (const x of f) {
        assert.deepEqual(Object.keys(x), ["rule", "severity", "path", "message", "fix"]);
        assert.ok(CHECKS.includes(x.rule), x.rule);
        assert.ok(["error", "warning"].includes(x.severity));
        assert.match(x.path, /^(\/[^/]*)*$/);
        assert.ok(x.message && x.fix);
      }
      const sorted = [...f].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0));
      assert.deepEqual(f, sorted);
      assert.deepEqual(checkCard(structuredClone(c)), f);
    }
    // Rule findings are warnings; only schema problems are errors.
    assert.ok(checkCard(EVERY_ELEMENT).every((x) => x.severity === "warning"));
  });
});

describe("US-085-AC6: high-impact actions are marked", () => {
  // @covers US-085-AC6
  test("an unmarked Submit or Execute titled with pay, send, delete or publish warns card.high-impact-marked", () => {
    const action = (title, extra = {}) => ({ type: "Action.Execute", title, verb: "act", ...extra });
    const f = checkCard(card([], { actions: [action("Pay invoice"), { type: "Action.Submit", title: "Send to Beta" }, action("Delete the draft"), action("Publish report"), action("Save draft"), { type: "Action.OpenUrl", title: "Pay online", url: "https://example.com" }] }));
    assert.deepEqual(at(f, "card.high-impact-marked"), ["/actions/0", "/actions/1", "/actions/2", "/actions/3"]);
    assert.match(f.find((x) => x.rule === "card.high-impact-marked").fix, /"ux-builder": \{ "highImpact": true/);
    // Marked: no warning; marked without a consequence: a warning on the marker.
    assert.deepEqual(at(checkCard(PAY_INVOICE), "card.high-impact-marked"), []);
    const noConsequence = card([], { actions: [action("Pay invoice", { data: { "ux-builder": { highImpact: true } } })] });
    assert.deepEqual(at(checkCard(noConsequence), "card.high-impact-marked"), ["/actions/0/data/ux-builder"]);
    // The verb counts too.
    assert.deepEqual(at(checkCard(card([], { actions: [action("Confirm", { verb: "pay" })] })), "card.high-impact-marked"), ["/actions/0"]);
  });
});
