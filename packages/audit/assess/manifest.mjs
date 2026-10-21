/* The assessment manifest, ux-assessment.yml (FEAT-009 CTX-01 to CTX-04,
   HLX-01, HLX-02, ENV-01 to ENV-03; CONTRACT-006 "Manifest").

   load() parses it; validate() checks it against its schema, the
   repository and the app's HELIX inputs, and returns every problem with its
   path. Nothing here writes. */

import Ajv2020 from "ajv/dist/2020.js";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { bind, criteriaOf, globOutsideRoot, HelixError, instances } from "./helix.mjs";

const own = createRequire(import.meta.url);
const SCHEMA = JSON.parse(readFileSync(own.resolve("../schema/assessment-manifest.schema.json"), "utf8"));
export const PRIORITIES = ["critical", "important", "secondary"];
export const STATES = ["success", "empty", "loading", "recoverable-error", "system-failure", "ai", "responsive-keyboard"];
export const ALLOW = ["create-test-data", "edit-test-data", "delete-test-data"];
export const DENY = ["payment", "send-message", "production-approval", "delete-real-data"];
export const PLACEHOLDER = /^<fill-in\b/;

// Values that look like credentials (FEAT-009 CTX-04): never in a manifest.
export const SECRETS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
  [/\bsk-[A-Za-z0-9_-]{16,}/, "an API key (sk-…)"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/, "a GitHub token"],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, "a Slack token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "an AWS access key"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, "a JWT"],
  [/^(?:Bearer|Basic)\s+\S{8,}/i, "an authorization header"],
];
const SECRET_KEYS = /^(password|passwd|secret|token|apiKey|api_key|cookie|authorization)$/i;

/* Parse a manifest file. Throws with the YAML error. */
export function load(file) {
  const text = readFileSync(file, "utf8");
  return { file: resolve(file), dir: dirname(resolve(file)), data: parseYaml(text), text };
}

const ptr = (p) => p.map((k) => "/" + String(k).replace(/~/g, "~0").replace(/\//g, "~1")).join("") || "/";

/* Every string in the manifest with its path. */
function* strings(v, path = []) {
  if (typeof v === "string") yield [path, v];
  else if (Array.isArray(v)) for (const [i, x] of v.entries()) yield* strings(x, [...path, i]);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { yield [[...path, k], null]; yield* strings(x, [...path, k]); }
}

/* A command's first program exists: an npm script in package.json, a
   file node runs, or a program on PATH. */
function commandProblem(cmd, cwd) {
  // Leading VAR=value assignments set the environment; the program follows.
  const words = cmd.trim().split(/\s+/).filter((w, i, all) => !all.slice(0, i + 1).every((x) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(x)));
  const pkg = (() => { try { return JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")); } catch { return null; } })();
  if (words[0] === "npm" && (words[1] === "run" || words[1] === "run-script")) {
    const ws = words.indexOf("--workspace") >= 0 ? words[words.indexOf("--workspace") + 1] : words.find((w) => w.startsWith("--workspace="))?.split("=")[1];
    if (ws) return null; // a workspace's scripts are its own package's; npm reports a missing one
    return pkg?.scripts?.[words[2]] ? null : `npm script "${words[2]}" is not in ${join(cwd, "package.json")}`;
  }
  if (words[0] === "npm" && words[1] === "test") return pkg?.scripts?.test ? null : `there is no npm test script in ${join(cwd, "package.json")}`;
  if (words[0] === "node" && words[1] && !words[1].startsWith("-")) return existsSync(resolve(cwd, words[1])) ? null : `${words[1]} does not exist`;
  if (words[0] === "npx") return null; // fetched on demand
  try { execFileSync("sh", ["-c", `command -v ${JSON.stringify(words[0])}`], { stdio: "ignore" }); return null; } catch { return `"${words[0]}" is not on PATH`; }
}

const origin = (u, base) => { try { return new URL(u, base).origin; } catch { return null; } };

/* Validate a loaded manifest. Returns { problems: [{ path, message }], helix, resolved }:
   helix is the binding when the marker resolved; resolved the manifest
   with its defaults (deny list, origins, cwd). */
export function validate(m) {
  const problems = [];
  const add = (path, message) => problems.push({ path: typeof path === "string" ? path : ptr(path), message });
  const d = m.data;
  if (!d || typeof d !== "object" || Array.isArray(d)) { add("/", "the manifest is not a YAML mapping"); return { problems, helix: null, resolved: null }; }

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const ok = ajv.validate(SCHEMA, d);
  if (!ok) for (const e of ajv.errors) {
    if (e.keyword === "oneOf" || (e.keyword === "const" && e.instancePath.includes("/auth"))) continue;
    add(e.keyword === "additionalProperties" ? `${e.instancePath}/${e.params.additionalProperty}` : e.instancePath || "/", e.keyword === "additionalProperties" ? `"${e.params.additionalProperty}" is not a manifest field` : e.keyword === "required" ? `needs "${e.params.missingProperty}"` : e.message);
  }
  for (const [i, r] of (d.roles ?? []).entries()) {
    const a = r?.auth;
    if (a !== undefined && a !== "none" && !(a && typeof a === "object" && ((typeof a.env === "string" && /^[A-Z_][A-Z0-9_]*$/.test(a.env) && Object.keys(a).length === 1) || (typeof a.storageState === "string" && Object.keys(a).length === 1)))) add(["roles", i, "auth"], 'must be "none", { env: NAME } or { storageState: path }: credentials are referenced, never written here');
  }

  // Secrets (CTX-04): named by field, never echoed.
  for (const [path, v] of strings(d)) {
    if (v === null) { if (SECRET_KEYS.test(String(path.at(-1)))) add(path, `"${path.at(-1)}" would hold a credential; reference it with auth: { env: NAME } instead`); continue; }
    const hit = SECRETS.find(([re]) => re.test(v));
    if (hit) add(path, `holds what looks like ${hit[1]}; reference credentials through the environment or a storage-state file`);
  }
  // Placeholders init left (CTX-02).
  for (const [path, v] of strings(d)) if (v && PLACEHOLDER.test(v)) add(path, `not filled in: ${v}`);

  // Environment and restrictions (ENV-01, ENV-02).
  if (d.run?.environment && !["local", "staging"].includes(d.run.environment)) add("/run/environment", d.run.environment === "production" ? "production is refused: assess a local or staging environment with disposable users and data" : 'must be "local" or "staging"');
  if (d.restrictions?.writes !== undefined && d.restrictions.writes !== "report-only") add("/restrictions/writes", 'must be "report-only": the assessment proposes changes and never applies them');
  for (const [i, a] of (d.restrictions?.allow ?? []).entries()) {
    if (DENY.includes(a)) add(["restrictions", "allow", i], `"${a}" is a consequential action and cannot be allowed in this version`);
    else if (!ALLOW.includes(a) && !PLACEHOLDER.test(a)) add(["restrictions", "allow", i], `unknown action "${a}"; allowed: ${ALLOW.join(", ")}`);
  }
  for (const [i, j] of (d.journeys ?? []).entries()) {
    if (j?.priority && !PRIORITIES.includes(j.priority) && !PLACEHOLDER.test(j.priority)) add(["journeys", i, "priority"], `must be one of ${PRIORITIES.join(", ")}`);
    if (j?.id && !/^J-[a-z0-9][a-z0-9-]*$/.test(j.id) && !PLACEHOLDER.test(j.id)) add(["journeys", i, "id"], "must look like J-<kebab-case>");
  }
  const base = d.run?.baseUrl && !PLACEHOLDER.test(d.run.baseUrl) ? d.run.baseUrl : null;
  const origins = (d.run?.origins?.length ? d.run.origins : base ? [base] : []).map((u) => origin(u)).filter(Boolean);
  if (base && !origin(base)) add("/run/baseUrl", "is not a URL");
  for (const [i, j] of (d.journeys ?? []).entries()) {
    if (!j?.entry || PLACEHOLDER.test(j.entry) || !base) continue;
    const o = origin(j.entry, base);
    if (!o || !origins.includes(o)) add(["journeys", i, "entry"], `${j.entry} is outside run.origins (${origins.join(", ") || "none"})`);
  }
  const ids = (k) => new Set((d[k] ?? []).map((x) => x?.id));
  for (const [i, j] of (d.journeys ?? []).entries()) {
    if (j?.role && !PLACEHOLDER.test(j.role) && !ids("roles").has(j.role)) add(["journeys", i, "role"], `no role "${j.role}" in roles`);
    if (j?.fixture && !ids("fixtures").has(j.fixture)) add(["journeys", i, "fixture"], `no fixture "${j.fixture}" in fixtures`);
    for (const s of (j?.states ? STATES.filter((x) => !j.states.includes(x)) : [])) if (!j.notApplicable?.[s]) add(["journeys", i, "notApplicable"], `state "${s}" is left out without a reason; add notApplicable.${s}`);
  }

  // Repository (CTX-03).
  const cwd = resolve(m.dir, d.run?.cwd ?? ".");
  if (!existsSync(cwd)) add("/run/cwd", `${cwd} does not exist`);
  else {
    if (d.run?.start && !PLACEHOLDER.test(d.run.start)) { const p = commandProblem(d.run.start, cwd); if (p) add("/run/start", p); }
    for (const [i, t] of (d.tests ?? []).entries()) if (t?.command && !PLACEHOLDER.test(t.command)) { const p = commandProblem(t.command, cwd); if (p) add(["tests", i, "command"], p); }
    for (const [i, r] of (d.roles ?? []).entries()) if (r?.auth?.storageState && !existsSync(resolve(m.dir, r.auth.storageState))) add(["roles", i, "auth", "storageState"], `${r.auth.storageState} does not exist (create it by signing in once; never commit it)`);
  }
  for (const k of ["include", "exclude"]) for (const [i, g] of (d.helix?.[k] ?? []).entries()) if (globOutsideRoot(g)) add(["helix", k, i], `${g} leaves the flow's root; globs may only narrow within it`);

  // HELIX (HLX-01, HLX-02; CTX-03): resolve as HELIX does, then check journeys against the flow.
  let helix = null;
  try {
    helix = bind(m.dir, d.helix ?? {});
    const docs = instances(helix.flow, helix.types, { include: d.helix?.include, exclude: d.helix?.exclude, repo: helix.marker.repo });
    const stories = new Map(docs.filter((x) => x.id && /^US-\d+$/.test(x.id)).map((x) => [x.id, x]));
    for (const [i, j] of (d.journeys ?? []).entries()) {
      if (!j?.story || PLACEHOLDER.test(j.story)) continue;
      const s = stories.get(j.story);
      if (!s) { add(["journeys", i, "story"], `no story ${j.story} in the flow "${helix.flow.id}" (${helix.flow.rootRel})`); continue; }
      const crit = new Set(criteriaOf(s).map((c) => c.id));
      for (const [k, c] of (j.criteria ?? []).entries()) if (!crit.has(c)) add(["journeys", i, "criteria", k], `${c} is not a criterion of ${j.story}`);
    }
    helix = { ...helix, documents: docs.length };
  } catch (e) {
    if (!(e instanceof HelixError)) throw e;
    add("/helix", e.code === "ambiguous" ? e.message : `HELIX ${e.code}: ${e.message}`);
  }
  const resolved = { ...d, run: { ...d.run, cwd, origins }, restrictions: { ...d.restrictions, deny: [...new Set([...DENY, ...(d.restrictions?.deny ?? [])])] } };
  problems.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { problems, helix, resolved };
}
