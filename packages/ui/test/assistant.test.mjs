/* The assistant's contract in Node (US-046-AC8, US-047-AC6, US-048-AC1 and
   AC3; CONTRACT-004 Assistant and generative UI): what the entry and the
   adapters import, how the adapters read each runtime's messages, the
   renderable allow-list and its schemas in the catalogue.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { RENDERABLE, checkRenderable } from "../dist/assistant.js";
import { fromAiSdk } from "../dist/assistant-ai-sdk.js";
import { fromAssistantUi } from "../dist/assistant-assistant-ui.js";
import { markRenderable } from "../../../tools/gen-catalogue.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(PKG, p), "utf8");
const pkg = JSON.parse(read("package.json"));
const cat = JSON.parse(read("catalogue.json"));
const specifiers = (src) => [...src.matchAll(/(?:^|\n)\s*(?:import|export)[^"'`;]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|(?:^|\n)\s*import\s*["']([^"']+)["']/g)].map((m) => m[1] ?? m[2] ?? m[3]);
const AI_LIBRARIES = /^(ai|@ai-sdk\/|@assistant-ui\/|assistant-cloud|assistant-stream|@copilotkit\/|openai|@anthropic-ai\/|langchain|@langchain\/)/;

describe("US-046-AC8: the assistant imports no AI library, and an app with no adapter installs none", () => {
  // @covers US-046-AC8
  test("the entry and both adapters import only React and the SDK's own modules, in source and as built", () => {
    const files = readdirSync(join(PKG, "src/assistant"), { recursive: true }).filter((f) => /\.(js|jsx)$/.test(f) && !/stories|story-data/.test(f));
    assert.ok(files.length >= 6);
    for (const f of files) {
      for (const s of specifiers(read(`src/assistant/${f}`))) {
        assert.ok(s.startsWith(".") || s === "react", `src/assistant/${f} imports ${s}`);
      }
    }
    // Built: each entry's own imports, and the shared chunks they pull in.
    const seen = new Set(), queue = ["dist/assistant.js", "dist/assistant-ai-sdk.js", "dist/assistant-assistant-ui.js"];
    while (queue.length) {
      const f = queue.shift();
      if (seen.has(f)) continue;
      seen.add(f);
      for (const s of specifiers(read(f))) {
        assert.doesNotMatch(s, AI_LIBRARIES, `${f} imports ${s}`);
        if (s.startsWith("./")) queue.push(`dist/${s.slice(2)}`);
        else assert.ok(["react", "react/jsx-runtime", "react-dom"].includes(s), `${f} imports ${s}`);
      }
    }
  });

  // @covers US-046-AC8
  test("the AI SDK and assistant-ui are optional peer dependencies, never dependencies; each adapter is its own entry point", () => {
    for (const lib of ["ai", "@assistant-ui/react"]) {
      assert.ok(pkg.peerDependencies[lib], `${lib} is a peer`);
      assert.equal(pkg.peerDependenciesMeta[lib]?.optional, true, `${lib} is optional`);
      assert.ok(!pkg.dependencies?.[lib], `${lib} is not a dependency`);
    }
    assert.ok(!Object.keys(pkg.dependencies ?? {}).some((d) => AI_LIBRARIES.test(d)), "no AI library is a dependency");
    assert.equal(pkg.exports["./assistant"], "./dist/assistant.js");
    assert.equal(pkg.exports["./assistant/ai-sdk"], "./dist/assistant-ai-sdk.js");
    assert.equal(pkg.exports["./assistant/assistant-ui"], "./dist/assistant-assistant-ui.js");
    // Neither the root entry nor the patterns pull in the assistant: an app that uses none carries none.
    for (const f of ["dist/index.js", "dist/patterns.js"]) assert.ok(!specifiers(read(f)).some((s) => /assistant/.test(s)), f);
  });

  // @covers US-046-AC8
  test("both adapters give the pattern the same conversation from their own runtime's messages", () => {
    const sdk = fromAiSdk([
      { id: "u", role: "user", parts: [{ type: "text", text: "When is the hearing?" }] },
      { id: "a", role: "assistant", parts: [{ type: "reasoning", text: "Look it up." }, { type: "tool-find_hearing", toolCallId: "t", state: "output-available", input: { m: 1 }, output: { date: "14 Nov" } }, { type: "text", text: "On 14 November [1]." }, { type: "source-url", sourceId: "s", url: "https://example.com/l", title: "Listing" }] },
    ], { status: "streaming" });
    const aui = fromAssistantUi([
      { id: "u", role: "user", content: [{ type: "text", text: "When is the hearing?" }] },
      { id: "a", role: "assistant", status: { type: "running" }, content: [{ type: "reasoning", text: "Look it up." }, { type: "tool-call", toolCallId: "t", toolName: "find_hearing", args: { m: 1 }, result: { date: "14 Nov" } }, { type: "text", text: "On 14 November [1]." }, { type: "source", sourceType: "url", id: "s", url: "https://example.com/l", title: "Listing" }] },
    ]);
    const shape = (ms) => ms.map((m) => ({ id: m.id, role: m.role, status: m.status, parts: m.parts.map((p) => ({ ...p, title: undefined })) }));
    assert.deepEqual(shape(sdk), shape(aui));
    assert.equal(sdk[1].status, "streaming");
    assert.deepEqual(sdk[1].parts.map((p) => p.type), ["reasoning", "tool", "text", "sources"]);
    // Status: an error, a stop, a reply not started yet.
    assert.equal(fromAiSdk([{ id: "u", role: "user", parts: [] }], { status: "error" }).at(-1).status, "error");
    assert.equal(fromAiSdk([{ id: "a", role: "assistant", parts: [] }], { stopped: new Set(["a"]) })[0].status, "stopped");
    assert.equal(fromAiSdk([{ id: "u", role: "user", parts: [] }], { status: "submitted" }).at(-1).status, "streaming");
    assert.equal(fromAssistantUi([{ id: "a", role: "assistant", content: [], status: { type: "incomplete", reason: "cancelled" } }])[0].status, "stopped");
    assert.equal(fromAssistantUi([{ id: "a", role: "assistant", content: [], status: { type: "incomplete", reason: "error" } }])[0].status, "error");
  });
});

describe("US-047-AC6: an adapter never reads an approval from the runtime", () => {
  // @covers US-047-AC6
  test("a request waiting for the user is current; any later state, approved or automatic, only makes it not current", () => {
    const tool = (state, approval) => [{ id: "a", role: "assistant", parts: [{ type: "tool-create_bill", toolCallId: "t", state, input: {}, approval }] }];
    const approvalOf = (ms) => ms[0].parts.find((p) => p.type === "approval");
    assert.deepEqual(approvalOf(fromAiSdk(tool("approval-requested", { id: "ap", isAutomatic: true }))), { type: "approval", id: "ap", action: "t", summary: "Run create_bill?", details: undefined, current: true }, "isAutomatic does not approve it");
    for (const [state, approval] of [["approval-responded", { id: "ap", approved: true }], ["output-available", { id: "ap", approved: true, isAutomatic: true }], ["output-denied", { id: "ap", approved: false }]]) {
      const a = approvalOf(fromAiSdk(tool(state, approval)));
      assert.equal(a.current, false, state);
      assert.ok(!("decision" in a) && !("approved" in a), `${state}: no decision is passed on`);
    }
    const aui = (approval) => fromAssistantUi([{ id: "a", role: "assistant", status: { type: "requires-action", reason: "tool-calls" }, content: [{ type: "tool-call", toolCallId: "t", toolName: "create_bill", args: {}, approval }] }])[0].parts.find((p) => p.type === "approval");
    assert.equal(aui({ id: "ap", prompt: "Create the bill?" }).current, true);
    assert.equal(aui({ id: "ap", prompt: "Create the bill?" }).summary, "Create the bill?");
    for (const approval of [{ id: "ap", approved: true }, { id: "ap", approved: true, isAutomatic: true }, { id: "ap", resolution: "expired" }]) {
      const a = aui(approval);
      assert.equal(a.current, false, JSON.stringify(approval));
      assert.ok(!("decision" in a) && !("approved" in a));
    }
  });
});

describe("US-048 generated UI is limited to the catalogue's renderable components", () => {
  // @covers US-048-AC1
  test("AC1: the catalogue marks each renderable component with its props schema, and generation fails on a name it lacks", () => {
    const marked = [...cat.widgets, ...cat.patterns, ...cat.assistant].filter((e) => e.renderable);
    assert.deepEqual(marked.map((e) => e.name).sort(), Object.keys(RENDERABLE).sort());
    for (const e of marked) {
      assert.deepEqual(e.propsSchema, RENDERABLE[e.name], e.name);
      assert.equal(e.type, "component");
      assert.match(e.import, /^import \{ \w+ \} from "@ux-builder\/ui(\/patterns|\/assistant)?";$/);
      assert.equal(e.propsSchema.type, "object");
      assert.equal(e.propsSchema.additionalProperties, false, `${e.name}: no unknown props`);
      for (const r of e.propsSchema.required ?? []) assert.ok(r in e.propsSchema.properties, `${e.name}.${r}`);
    }
    for (const n of ["DataTable", "Card", "Notice", "DescriptionList", "InlineForm"]) assert.ok(RENDERABLE[n], n);
    assert.ok(!marked.some((e) => ["Conversation", "Dialog", "AppShell"].includes(e.name)));
    assert.throws(() => markRenderable([[{ name: "Card", type: "component" }]], { Card: { type: "object" }, Iframe: { type: "object" } }), /renderable\.json names components the catalogue lacks: Iframe/);
    assert.match(read("AGENTS.md"), /### Assistant[\s\S]*list_renderable/);
  });

  // @covers US-048-AC3
  test("AC3: a name outside the allow-list, a missing required prop, a wrong type or an unknown prop is refused", () => {
    const table = { columns: [{ key: "a", label: "A" }], rows: [{ a: 1 }] };
    assert.deepEqual(checkRenderable("DataTable", table), { ok: true, problems: [] });
    assert.deepEqual(checkRenderable("<iframe>", {}).ok, false);
    assert.deepEqual(checkRenderable("constructor", {}).ok, false, "no prototype names");
    assert.match(checkRenderable("DataTable", { ...table, rows: "x" }).problems.join(), /props\.rows should be array/);
    assert.match(checkRenderable("DataTable", { columns: table.columns }).problems.join(), /props\.rows is required/);
    assert.match(checkRenderable("DataTable", { ...table, dangerouslySetInnerHTML: { __html: "<b>" } }).problems.join(), /not a known prop/);
    assert.match(checkRenderable("DataTable", { ...table, rows: [{ a: { $$typeof: "react.element" } }] }).problems.join(), /props\.rows\[0\]\.a should be/);
    assert.match(checkRenderable("Notice", { title: "x", tone: "danger" }).problems.join(), /should be one of/);
    assert.equal(checkRenderable("InlineForm", { fields: [{ name: "a", label: "A", type: "file" }] }).ok, false);
  });
});
