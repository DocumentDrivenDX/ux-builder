/* The design state (CONTRACT-008 Design state, ADR-036 rule 6):
   .ux-builder/design-state.json, validated on every read and write and
   written in a stable key order so git can merge it. */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { DesignError, writeInApp } from "./app.mjs";

export const STATE_FILE = ".ux-builder/design-state.json";
export const SCHEMA = JSON.parse(readFileSync(new URL("./schema/design-state.schema.json", import.meta.url), "utf8"));

let validator;
function compiled() {
  if (!validator) validator = new Ajv2020({ allErrors: true, strict: false }).compile(SCHEMA);
  return validator;
}

/* [{ path, message }] for a state, empty when it is valid. Paths are
   written as the state command takes them: assumptions[0].status. */
export function validateState(state) {
  const validate = compiled();
  if (validate(state)) return [];
  return validate.errors.map((e) => {
    let path = e.instancePath.split("/").slice(1).reduce((p, seg) => (/^\d+$/.test(seg) ? `${p}[${seg}]` : p ? `${p}.${seg}` : seg), "");
    if (e.keyword === "additionalProperties") path = path ? `${path}.${e.params.additionalProperty}` : e.params.additionalProperty;
    const message = e.keyword === "additionalProperties" ? "is not a design state field"
      : e.keyword === "enum" ? `must be one of ${e.params.allowedValues.join(", ")}`
      : e.message;
    return { path: path || "(root)", message };
  });
}

export function emptyState({ startedFrom = "new" } = {}) {
  return {
    version: 1,
    activity: startedFrom === "existing" ? "baseline" : "define",
    mode: "full",
    startedFrom,
    checkpoints: [],
    questions: [],
    assumptions: [],
    alternatives: [],
    principles: [],
    issues: [],
    experiments: [],
    faked: [],
    next: "",
  };
}

/* Keys in the schema's order, recursively; the same state always gives the
   same bytes. */
export function canonical(value, schema = SCHEMA) {
  if (Array.isArray(value)) return value.map((v) => canonical(v, schema?.items));
  if (value && typeof value === "object") {
    const props = schema?.properties ?? {};
    const keys = [...Object.keys(props).filter((k) => k in value), ...Object.keys(value).filter((k) => !(k in props)).sort()];
    return Object.fromEntries(keys.map((k) => [k, canonical(value[k], props[k])]));
  }
  return value;
}

export const serialize = (state) => JSON.stringify(canonical(state), null, 2) + "\n";

export function hasState(app) {
  return existsSync(join(app, STATE_FILE));
}

export function readState(app) {
  const file = join(app, STATE_FILE);
  if (!existsSync(file)) throw new DesignError(`no design state in ${app}: run ux-builder-design init`);
  let state;
  try { state = JSON.parse(readFileSync(file, "utf8")); } catch (e) {
    throw new DesignError(`${STATE_FILE} is not valid JSON: ${e.message}`);
  }
  const errors = validateState(state);
  if (errors.length) throw new DesignError(`${STATE_FILE} is not a valid design state`, errors);
  return state;
}

export function writeState(app, state) {
  const errors = validateState(state);
  if (errors.length) throw new DesignError("not a valid design state", errors);
  writeInApp(app, STATE_FILE, serialize(state));
  return state;
}

/* A path such as assumptions[0].status, next, or assumptions[+] (append),
   as a list of keys and indexes. */
export function parsePath(path) {
  if (!path) return [];
  const out = [];
  for (const part of String(path).split(".")) {
    const m = part.match(/^([A-Za-z][A-Za-z0-9]*)?((?:\[(?:\d+|\+)\])*)$/);
    if (!m || (!m[1] && !m[2])) throw new DesignError(`bad path "${path}": use field, field[n] or field[+], joined by dots`);
    if (m[1]) out.push(m[1]);
    for (const [, idx] of m[2].matchAll(/\[(\d+|\+)\]/g)) out.push(idx === "+" ? "+" : Number(idx));
  }
  return out;
}

export function stateGet(app, { path } = {}) {
  const state = readState(app);
  let v = state;
  for (const key of parsePath(path)) {
    if (key === "+" || v == null || !(key in Object(v))) throw new DesignError(`no value at "${path}"`);
    v = v[key];
  }
  return { path: path ?? "", value: v };
}

/* Fields an appended item gets when the agent leaves them out. */
const NEXT_ID = { assumptions: "A", questions: "Q", experiments: "EXP", principles: "PR" };
function withDefaults(list, items, item, now) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;
  const out = { ...item };
  const prefix = NEXT_ID[list];
  if (prefix && out.id === undefined) {
    const used = items.map((i) => Number(String(i.id ?? "").split("-").pop())).filter(Number.isFinite);
    out.id = `${prefix}-${Math.max(0, ...used) + 1}`;
  }
  if (list === "assumptions") { out.status ??= "assumed"; out.evidence ??= []; }
  if (list === "questions") out.status ??= "open";
  if (list === "principles") out.status ??= "assumed";
  if (list === "alternatives") out.status ??= "candidate";
  if (list === "issues") out.status ??= "open";
  if (list === "experiments") out.status ??= "running";
  if (list === "checkpoints") out.at ??= now;
  return out;
}

export function stateSet(app, { path, value, now = new Date().toISOString() } = {}) {
  const keys = parsePath(path);
  if (!keys.length) throw new DesignError("state set needs a path");
  const state = structuredClone(readState(app));
  let parent = state;
  for (const key of keys.slice(0, -1)) {
    if (key === "+" || parent[key] == null) throw new DesignError(`no value at "${path}"`);
    parent = parent[key];
  }
  const last = keys.at(-1);
  let written;
  if (last === "+") {
    if (!Array.isArray(parent)) throw new DesignError(`"${path}": [+] appends to a list`);
    written = withDefaults(keys.at(-2), parent, value, now);
    parent.push(written);
  } else {
    if (typeof last === "number" && (!Array.isArray(parent) || last >= parent.length)) throw new DesignError(`no value at "${path}"`);
    parent[last] = value;
    written = value;
  }
  writeState(app, state);
  return { path, value: written, state };
}
