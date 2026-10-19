#!/usr/bin/env node
/* Copies AI Elements components, assistant-ui's registry components, and the
   shadcn/ui components they use, into
   packages/ui/ai/vendor/ for Storybook and the theme builder's theme pages
   (US-045-AC4, AC5). It does what the AI Elements CLI does, without running
   it: it reads the same registry items (registry.ai-sdk.dev and
   r.assistant-ui.com, then ui.shadcn.com for their registry dependencies),
   makes the import paths
   relative, and writes each file with its licence notice and a "Changed by"
   line, as ADR-023 rule 6 requires; packages/ui/licenses/vendored.json
   records them for tools/check-licences.mjs. Nothing here ships in a
   package.

     node tools/vendor-ai-elements.mjs        fetch and write
   Then npm run licences --write if the files changed. */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "packages/ui/ai");
const TODAY = "2026-10-19";

/* The AI Elements the SDK previews: the parts of an assistant that FEAT-007 names. */
export const ELEMENTS = ["conversation", "message", "prompt-input", "reasoning", "tool", "sources", "suggestion", "code-block", "confirmation", "shimmer", "chain-of-thought", "task", "inline-citation", "artifact"];
/* What each one is for, in the SDK's words (the registries describe them only as "AI-powered"). */
const PURPOSE = {
  conversation: "The scrolling list of a conversation's messages, kept at the newest, with a button back to it.",
  message: "One message from the user or the assistant, its markdown rendered, with actions such as copy and retry.",
  "prompt-input": "Where the user writes to the assistant: a growing text field, its tools and the send button.",
  reasoning: "The assistant's reasoning, collapsed behind a line that says how long it thought.",
  tool: "A tool the assistant called: its name and state, and on request its input and output.",
  sources: "The sources an answer used, behind a count, each a link.",
  suggestion: "Prompts the user can send with one choice.",
  "code-block": "Code with syntax colours and a copy button.",
  confirmation: "An action the assistant wants to take, waiting for the user to approve or deny it.",
  shimmer: "Text that shimmers while the assistant works.",
  "chain-of-thought": "The steps the assistant took, each with what it found.",
  task: "A task the assistant worked through, and its items.",
  "inline-citation": "A citation inside the text, opening the source it cites.",
  artifact: "Something the assistant made, such as a draft or a table, with actions on it.",
  thread: "assistant-ui's whole chat: the messages, the composer, suggestions and scrolling.",
};

/* assistant-ui's current components (its CLI's registry); its older packaged styles, @assistant-ui/react-ui, are unmaintained. */
export const ASSISTANT_UI = ["thread"];
const AI = (n) => `https://registry.ai-sdk.dev/${n}.json`;
const AUI = (n) => `https://r.assistant-ui.com/${n}.json`;
const SHADCN = (n) => `https://ui.shadcn.com/r/styles/new-york-v4/${n}.json`;
const LICENCES = {
  "ai-elements": { url: "https://raw.githubusercontent.com/vercel/ai-elements/main/LICENSE", notice: "Copyright 2023 Vercel, Inc.", spdx: "Apache-2.0", from: "AI Elements (https://github.com/vercel/ai-elements)" },
  "shadcn-ui": { url: "https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md", notice: "Copyright (c) 2023 shadcn", spdx: "MIT", from: "shadcn/ui (https://github.com/shadcn-ui/ui)" },
  "assistant-ui": { url: "https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/LICENSE", notice: "Copyright (c) 2026 AgentbaseAI Inc.", spdx: "MIT", from: "assistant-ui (https://github.com/assistant-ui/assistant-ui)" },
};

/* Changes beyond import paths, each said in the file's "Changed by" line. */
const PATCHES = {
  "ai-elements/code-block.tsx": {
    why: "syntax colours from shiki's high-contrast themes, as one-light and one-dark-pro fall below 4.5:1 on the theme's ground (WCAG 1.4.3)",
    edits: [['theme: "one-light"', 'theme: "github-light-high-contrast"'], ['theme: "one-dark-pro"', 'theme: "github-dark-high-contrast"']],
  },
};

const write = (rel, text) => { const p = join(OUT, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); return rel; };

const DIRS = { "ai-elements": "vendor/ai-elements", "assistant-ui": "vendor/assistant-ui", "shadcn-ui": "vendor/ui" };
const kindOf = (url) => (url.includes("ai-sdk.dev") ? "ai-elements" : url.includes("assistant-ui.com") ? "assistant-ui" : "shadcn-ui");

function relink(content, kind) {
  const ui = kind === "shadcn-ui" ? "./" : "../ui/";
  return content
    .replace(/from "@\/components\/assistant-ui\/(?:elements\/)?([\w.-]+)"/g, 'from "./$1"')
    // assistant-ui's files are kept in one folder, so its hooks and utils sit beside its components.
    .replace(/from "@\/hooks\/([\w.-]+)"/g, kind === "assistant-ui" ? 'from "./$1"' : 'from "../hooks/$1"')
    .replace(/from "\.\.\/utils\/([\w.-]+)"/g, kind === "assistant-ui" ? 'from "./$1"' : 'from "../utils/$1"')
    .replace(/from "@\/(?:components|registry\/new-york-v4)\/ui\/([\w-]+)"/g, `from "${ui}$1"`)
    .replace(/from "@\/lib\/utils"/g, 'from "../lib/utils"')
    .replace(/from "cn"/g, 'from "../lib/utils"');
}

async function main() {
  const items = new Map();
  const queue = [...ELEMENTS.map((n) => [AI(n), "ai-elements"]), ...ASSISTANT_UI.map((n) => [AUI(n), "assistant-ui"])];
  while (queue.length) {
    const [url, kind] = queue.shift();
    if (items.has(url)) continue;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    const item = await res.json();
    items.set(url, { item, kind });
    for (const d of item.registryDependencies ?? []) queue.push(d.startsWith("http") ? [d, kindOf(d)] : [SHADCN(d), "shadcn-ui"]);
  }
  const written = { "ai-elements": [], "assistant-ui": [], "shadcn-ui": [] }, deps = new Set();
  for (const [url, { item, kind }] of items) {
    for (const d of item.dependencies ?? []) deps.add(d);
    for (const f of item.files ?? []) {
      const name = f.path.split("/").pop();
      const dir = DIRS[kind];
      const l = LICENCES[kind];
      const patch = PATCHES[`${dir.split("/").pop()}/${name}`];
      let body = relink(f.content, kind);
      for (const [from, to] of patch?.edits ?? []) { if (!body.includes(from)) throw new Error(`${name}: patch "${from}" no longer applies`); body = body.replaceAll(from, to); }
      const header = `/* From ${l.from}, registry item "${item.name}" (${url}), ${l.spdx}:\n   ${l.notice}; the licence is ai/licenses/${kind}.LICENSE.\n   Changed by the UX Builder authors, ${TODAY}: import paths made relative${patch ? `; ${patch.why}` : ""} (tools/vendor-ai-elements.mjs). */\n`;
      written[kind].push(write(`${dir}/${name}`, header + body));
    }
  }
  // AI Elements' LICENSE is the short Apache notice; Apache-2.0 asks for a copy of the licence itself, so its full text follows.
  const apache = await (await fetch("https://www.apache.org/licenses/LICENSE-2.0.txt")).text();
  for (const [kind, l] of Object.entries(LICENCES)) {
    const text = await (await fetch(l.url)).text();
    write(`licenses/${kind}.LICENSE`, l.spdx === "Apache-2.0" && !/TERMS AND CONDITIONS/.test(text) ? `${text.trim()}\n\n${apache}` : text);
  }
  // What the theme pages list under AI Components: each previewed component, its library and its documentation.
  const pascal = (n) => n.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  const docs = { "ai-elements": (n) => `https://elements.ai-sdk.dev/components/${n}`, "assistant-ui": (n) => `https://www.assistant-ui.com/docs/ui/${pascal(n)}` };
  const listed = [...ELEMENTS.map((n) => [AI(n), "ai-elements", n]), ...ASSISTANT_UI.map((n) => [AUI(n), "assistant-ui", n])].map(([url, kind, n]) => {
    const { item } = items.get(url);
    return { name: pascal(n), library: kind === "ai-elements" ? "AI Elements" : "assistant-ui", licence: LICENCES[kind].spdx, description: PURPOSE[n] ?? item.description ?? "", docs: docs[kind](n), registry: url };
  });
  write("vendor/components.json", JSON.stringify({ $description: "Generated by tools/vendor-ai-elements.mjs: the AI Components the theme pages and Storybook preview.", components: listed }, null, 2) + "\n");
  write("vendor/lib/utils.ts", `/* The class-name helper shadcn/ui's and AI Elements' components import as cn. Ours. */\nimport { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}\n`);
  console.log(JSON.stringify({ written, dependencies: [...deps].sort() }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
