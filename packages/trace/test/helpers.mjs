/* Shared by the trace tests: temporary apps in temporary git repositories,
   and running the CLI as a child process. */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after } from "node:test";

export const CLI = fileURLToPath(new URL("../cli.mjs", import.meta.url));
export const PKG = fileURLToPath(new URL("..", import.meta.url));
const made = [];
after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });

const env = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));

export function git(dir, ...args) {
  return execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args], { cwd: dir, encoding: "utf8", env: env(), stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/* A new app folder: package.json, optionally a git repository with one commit. */
export function tempApp({ repo = true, pkg = { name: "sample-app", private: true } } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ux-trace-"));
  made.push(dir);
  writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  if (repo) {
    git(dir, "init", "-q", "-b", "main");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "Initial commit");
  }
  return dir;
}

export function commit(dir, file, message) {
  writeFileSync(join(dir, file), `${file}\n`);
  git(dir, "add", file);
  git(dir, "commit", "-q", "-m", message);
  return git(dir, "rev-parse", "HEAD");
}

/* Run ux-builder-trace: { status, stdout, stderr }. */
export function cli(cwd, args, { input, nodeArgs = [] } = {}) {
  const r = spawnSync(process.execPath, [...nodeArgs, CLI, ...args], { cwd, input, encoding: "utf8", env: env() });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

export const lines = (file) => readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
export const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

/* Secret-shaped values for the masking tests: assembled at run time so this
   source file holds no literal that a secret scanner would flag. */
export const SECRETS = {
  apiKey: ["sk", "proj", "A1b2C3d4E5f6G7h8I9j0K1l2"].join("-"),
  github: ["ghp", "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"].join("_"),
  jwt: ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0NTY3ODkwIn0", "dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk"].join("."),
  env: "hunter2-correct-horse-battery",
  client: "ACME-4417",
};
