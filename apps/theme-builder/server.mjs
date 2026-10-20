#!/usr/bin/env node
/* The theme builder (SD-002, ADR-019): the app and its local API in one
   process, on 127.0.0.1 only.

     npm run builder                      # from the repository root
     PORT=5180 BUILDER_MODEL=mock BUILDER_REVIEW=files BUILDER_ROOT=/tmp/copy node server.mjs

   BUILDER_MODEL   an OpenAI model id (default gpt-5.4-mini), or "mock"
   BUILDER_REVIEW  pr (default): branch, commit, push, gh pr create; files: write only
   BUILDER_ROOT    the repository to read names from and save into (default: this one) */

import OpenAI from "openai";
import { createServer } from "node:http";
import { createServer as createVite } from "vite";
import { context } from "./api/context.mjs";
import { DEFAULT_MODEL, feedback } from "./api/feedback.mjs";
import { openaiKey } from "./api/key.mjs";
import { save } from "./api/save.mjs";
import { theme } from "./api/theme.mjs";
import { REPO, viteOptions } from "./vite.shared.mjs";

const root = process.env.BUILDER_ROOT ?? REPO;
const review = process.env.BUILDER_REVIEW === "files" ? "files" : "pr";
const port = Number(process.env.PORT ?? 5180);

const modelName = process.env.BUILDER_MODEL ?? DEFAULT_MODEL;
const key = modelName === "mock" ? null : openaiKey();
const model = modelName === "mock"
  ? { available: true, mock: true, name: "mock" }
  : key ? { available: true, name: modelName, client: new OpenAI({ apiKey: key }) }
  : { available: false, reason: "No OpenAI API key: set OPENAI_API_KEY or add the Keychain item openai-api-key. The settings panel still works." };

// Live reload rides on this server's own port, so two dev servers never fight over one.
const http = createServer();
const vite = await createVite({
  ...viteOptions(), appType: "spa",
  server: { middlewareMode: true, hmr: { server: http }, fs: { allow: [REPO] } },
  optimizeDeps: { entries: ["index.html"] },   // not the e2e test client's page
});

async function readJson(req, limit = 12 * 1024 * 1024) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error("request too large"), { status: 413 }); chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { throw Object.assign(new Error("not JSON"), { status: 400 }); }
}
const send = (res, status, body) => { res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(body)); };

const api = {
  "GET /api/context": () => context({ root, model }),
  "GET /api/theme": (req) => theme({ root, name: new URL(req.url, "http://localhost").searchParams.get("name") }),
  "POST /api/feedback": async (req) => {
    if (!model.available) throw Object.assign(new Error(model.reason), { status: 503 });
    return feedback({ body: await readJson(req), model });
  },
  "POST /api/save": async (req) => save({ body: await readJson(req), root, review, designSystems: context({ root, model }).designSystems.map((d) => d.name) }),
};

http.on("request", async (req, res) => {
  const route = api[`${req.method} ${req.url.split("?")[0]}`];
  if (!route) return vite.middlewares(req, res);
  try { send(res, 200, await route(req)); }
  catch (e) { send(res, e.status ?? 500, { error: e.status ? e.message : `server error: ${e.message}` }); if (!e.status) console.error(e); }
});
http.listen(port, "127.0.0.1", () => {
  console.log(`theme builder: http://127.0.0.1:${port}/  (model: ${model.available ? model.name : "unavailable"}, review: ${review}, repo: ${root})`);
});
