/* ux-builder-audit doctor (US-158-AC3): the @ux-builder packages an app has
   installed, and whether they agree. Each installed package's dependency
   and peer ranges on another @ux-builder package must be met by the copy
   the app has; so must the app's own package.json ranges. A small semver
   range check, so the audit needs no new dependency.

     doctor(app)  { app, packages: [{ name, version, wanted }], problems: [{ package, needs, range, installed, via, message }], coherent } */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const read = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };

/* A version as [major, minor, patch, prerelease]; a missing or x part is null. */
const part = (x) => (x == null || x === "" || /^[x*]$/i.test(x) ? null : Number(x));
function parse(v) {
  const m = /^\s*[=v]*\s*(\d+|[x*])(?:\.(\d+|[x*]))?(?:\.(\d+|[x*]))?(?:-([0-9A-Za-z.-]+))?(?:\+\S*)?\s*$/i.exec(v);
  return m ? [part(m[1]), part(m[2]), part(m[3]), m[4] ?? null] : null;
}
const cmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]) || (a[3] === b[3] ? 0 : a[3] == null ? 1 : b[3] == null ? -1 : a[3] < b[3] ? -1 : 1);
const full = (p) => [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3]];

/* One comparator ("^1.2.3", "~0.4", ">=2", "1.x", "1.2.3") as [[op, version]]. */
function comparators(c) {
  const m = /^(\^|~>?|>=|<=|>|<|=)?\s*(.+)$/.exec(c);
  const op = m[1] ?? "", p = parse(m[2]);
  if (!p) return null;
  const lo = full(p);
  const bump = (i) => [...lo.slice(0, i).map((x, k) => (k === i - 1 ? x + 1 : x)), ...Array(3 - i).fill(0), null];
  if (op === "^") { const i = lo[0] > 0 || p[1] == null ? 1 : lo[1] > 0 || p[2] == null ? 2 : 3; return [[">=", lo], ["<", bump(i)]]; }
  if (op.startsWith("~")) return [[">=", lo], ["<", bump(p[1] == null ? 1 : 2)]];
  if (op && op !== "=") return [[op, lo]];
  if (p[0] == null) return [];
  if (p[1] == null) return [[">=", lo], ["<", bump(1)]];
  if (p[2] == null) return [[">=", lo], ["<", bump(2)]];
  return [["=", lo]];
}

/* Does version meet range? Ranges npm does not compare (tags, file:, workspace:, URLs) count as met. */
export function satisfies(version, range) {
  const v = parse(version ?? "");
  if (!v || v[0] == null) return false;
  const r = String(range ?? "").trim();
  if (!r || r === "*" || r === "latest" || /^(file|link|workspace|npm|git|https?):|\//.test(r)) return true;
  return r.split("||").some((set) => {
    const parts = set.trim().replace(/(\^|~>?|>=|<=|>|<|=)\s+/g, "$1").split(/\s+/).filter(Boolean);
    // A hyphen range, "1.2.3 - 2.3.4".
    const list = parts.length === 3 && parts[1] === "-" ? [[">=", full(parse(parts[0]) ?? [0])], ["<=", full(parse(parts[2]) ?? [0])]] : parts.flatMap((c) => comparators(c) ?? [["!", null]]);
    // A prerelease meets a range only through a comparator on the same major.minor.patch.
    if (v[3] && !list.some(([, x]) => x?.[3] && x[0] === v[0] && x[1] === v[1] && x[2] === v[2])) return false;
    return list.every(([op, x]) => {
      if (op === "!") return false;
      const d = cmp(v, x);
      return op === ">=" ? d >= 0 : op === "<=" ? d <= 0 : op === ">" ? d > 0 : op === "<" ? d < 0 : d === 0;
    });
  });
}

/* The app's @ux-builder packages and whether they agree. */
export function doctor(app = process.cwd()) {
  app = resolve(app);
  const pkg = read(join(app, "package.json")) ?? {};
  const wanted = { ...pkg.devDependencies, ...pkg.peerDependencies, ...pkg.dependencies };
  const scope = join(app, "node_modules", "@ux-builder");
  const names = new Set(Object.keys(wanted).filter((n) => n.startsWith("@ux-builder/")));
  try { for (const n of readdirSync(scope)) if (existsSync(join(scope, n, "package.json"))) names.add(`@ux-builder/${n}`); } catch { /* none installed */ }
  // As Node finds it: the app's node_modules, then each folder above (a workspace hoists them).
  const at = (name) => { for (let d = app; ; d = dirname(d)) { const p = read(join(d, "node_modules", name, "package.json")); if (p || dirname(d) === d) return p; } };
  // And the @ux-builder packages those depend on, as installed.
  for (const n of names) for (const d of Object.keys({ ...at(n)?.dependencies, ...at(n)?.peerDependencies })) if (d.startsWith("@ux-builder/") && at(d)) names.add(d);
  const packages = [...names].sort().map((name) => ({ name, version: at(name)?.version ?? null, ...(wanted[name] ? { wanted: wanted[name] } : {}) }));
  const installed = new Map(packages.map((p) => [p.name, p.version]));
  const problems = [];
  const check = (owner, needs, range, via) => {
    const got = installed.get(needs) ?? at(needs)?.version ?? null;
    if (via === "peerDependencies" && !got && at(owner)?.peerDependenciesMeta?.[needs]?.optional) return;
    if (got && satisfies(got, range)) return;
    const who = owner === "app" ? "The app's package.json" : `${owner} ${installed.get(owner)}`;
    problems.push({ package: owner, needs, range, installed: got, via, message: got ? `${who} needs ${needs} ${range}, but ${got} is installed${via === "dependencies" && owner !== "app" ? `; ${owner} reads its own copy, so it and the app see different versions` : ""}` : `${who} needs ${needs} ${range}, and it is not installed` });
  };
  for (const [name, range] of Object.entries(wanted)) if (name.startsWith("@ux-builder/")) check("app", name, range, "app");
  for (const p of packages) {
    const own = at(p.name);
    if (!own) continue;
    for (const via of ["dependencies", "peerDependencies"]) for (const [needs, range] of Object.entries(own[via] ?? {})) if (needs.startsWith("@ux-builder/")) check(p.name, needs, range, via);
  }
  return { app, packages, problems, coherent: problems.length === 0 };
}

export function doctorText(r) {
  const lines = [`@ux-builder packages in ${r.app}:`];
  if (!r.packages.length) lines.push("  none (no @ux-builder package in package.json or node_modules)");
  for (const p of r.packages) lines.push(`  ${p.name.padEnd(24)} ${(p.version ?? "not installed").padEnd(10)}${p.wanted ? ` (package.json: ${p.wanted})` : ""}`);
  lines.push(r.coherent ? "Coherent: every @ux-builder package's ranges are met." : `Incoherent: ${r.problems.length} range${r.problems.length === 1 ? "" : "s"} not met.`);
  for (const x of r.problems) lines.push(`  - ${x.message}`);
  if (!r.coherent) lines.push("Install versions that agree (npm install @ux-builder/<name>@<version>), then run this again.");
  return lines.join("\n");
}
