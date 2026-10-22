/* The builder's server answers a failed save in plain words and keeps
   running (US-019-AC9). A failed git command's exit code (child_process puts
   it in e.status) once reached writeHead as an HTTP status and crashed it.

     npm test --workspace @ux-builder/theme-builder */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { generateFromFile } from "../../../packages/engine/node.js";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const LOGO = join(ROOT, "tests/fixtures/logos/red-mark.svg");
const tmp = mkdtempSync(join(tmpdir(), "builder-server-"));
const PORT = 5300 + Math.floor(Math.random() * 600);
let server;

before(async () => {
  // Not a git repository: the save's first git command fails with exit code 128.
  const root = join(tmp, "not-a-clone");
  for (const d of ["tokens", "brand"]) cpSync(join(ROOT, d), join(root, d), { recursive: true });
  server = spawn(process.execPath, [join(ROOT, "apps/theme-builder/server.mjs")], {
    env: { ...process.env, PORT: String(PORT), BUILDER_ROOT: root, BUILDER_MODEL: "mock", BUILDER_REVIEW: "pr", GIT_CEILING_DIRECTORIES: tmp, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "t@example.com" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("the server did not start")), 60_000);
    server.stdout.on("data", (b) => { if (String(b).includes("theme builder:")) { clearTimeout(t); resolve(); } });
    server.on("exit", (code) => { clearTimeout(t); reject(new Error(`the server exited (${code})`)); });
  });
});
after(() => { server?.kill(); rmSync(tmp, { recursive: true, force: true }); });

// @covers US-019-AC9
test("AC9: a save whose git command fails answers 500 with what failed, and the server keeps running", async () => {
  const { options } = await generateFromFile(LOGO);
  const body = { name: "crash-carbon", designSystem: "carbon", option: options[0], logo: { filename: "acme.svg", base64: readFileSync(LOGO).toString("base64") } };
  const res = await fetch(`http://127.0.0.1:${PORT}/api/save`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal(res.status, 500);
  const { error } = await res.json();
  assert.match(error, /^server error: .*not a git repository/i, "the command's own reason, not a crash");
  assert.equal(server.exitCode, null, "still running");
  assert.equal((await fetch(`http://127.0.0.1:${PORT}/api/context`)).status, 200, "and answering");
});
