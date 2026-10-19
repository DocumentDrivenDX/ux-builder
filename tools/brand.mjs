#!/usr/bin/env node
/* Palette options from a logo, and brand files from them (FEAT-002, SD-001).

     npm run brand -- <logo.svg|png>                       print the options
     npm run brand -- <logo> --out tokens/brands/acme.brand.json [--strategy muted] [--name acme] [--title Acme]
     npm run brand -- <logo> --out tokens/brands/acme.brand.json --design-system databricks [--default light]
     npm run brand -- <logo> --settings s.json --set hueShift=-12 --set chromaScale=0.8
     npm run brand -- --regenerate tokens/brands/acme.brand.json
     npm run brand -- --schema                             the settings schema (JSON)

   --strategy picks an option by label (faithful, muted, muted-softer, ...);
   the default is the first. With --design-system, the theme an app selects
   (ADR-018) is written too: <name>.theme.json in the themes/ folder beside
   brands/ (else next to the brand file), pairing the brand with that shared
   design system; --default sets its default appearance. Without it, only the
   brand is written, for previewing on every design system before choosing.
   Existing files are not overwritten without --force. Settings come from --settings (a JSON object)
   and then --set name=value, later wins. Out-of-range values are clamped
   with a warning. --regenerate rebuilds a brand file from its recorded
   settings and logo and exits 1 if any colour differs (FR-12).

   Exit codes: 0 ok, 1 regeneration differs, 2 usage or input error. */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { EngineError, designSystems, generateFromFile, regenerateFile, settingsSchema, SETTINGS } from "../packages/engine/node.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const warn = (m) => console.error(`warning: ${m}`);
const die = (m) => { console.error(`brand: ${m}`); process.exit(2); };

let args;
try {
  args = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string" }, strategy: { type: "string" }, settings: { type: "string" },
      set: { type: "string", multiple: true }, name: { type: "string" }, title: { type: "string" },
      "design-system": { type: "string" }, default: { type: "string" }, force: { type: "boolean" },
      regenerate: { type: "string" }, schema: { type: "boolean" }, json: { type: "boolean" }, help: { type: "boolean", short: "h" },
    },
  });
} catch (e) { die(e.message); }
const { values: o, positionals } = args;

if (o.help) { console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^#!.*\n\/\*\s?/, "")); process.exit(0); }
if (o.schema) { console.log(JSON.stringify(settingsSchema, null, 2)); process.exit(0); }

try {
  if (o.regenerate) await regen(o.regenerate);
  else await options(positionals[0]);
} catch (e) {
  if (e instanceof EngineError || e.code === "ENOENT") die(e.message);
  throw e;
}

async function regen(path) {
  const r = await regenerateFile(path);
  for (const w of r.warnings) warn(w);
  if (r.identical) { console.log(`${path}: identical: every colour regenerates exactly from its recorded settings`); return; }
  console.log(`${path}: ${r.differences.length} difference${r.differences.length === 1 ? "" : "s"}`);
  for (const d of r.differences) console.log(d.role ? `  ${d.appearance} ${d.role}: recorded ${d.recorded}, regenerates ${d.regenerated}` : `  ${d.appearance ?? ""} ${d.problem}`);
  process.exit(1);
}

function readSettings() {
  const s = {};
  if (o.settings) Object.assign(s, JSON.parse(readFileSync(o.settings, "utf8")));
  for (const kv of o.set ?? []) {
    const i = kv.indexOf("=");
    if (i < 1) die(`--set ${kv}: expected name=value`);
    const k = kv.slice(0, i), v = kv.slice(i + 1);
    s[k] = SETTINGS[k]?.type === "string" ? v : Number(v);
  }
  return s;
}

async function options(logo) {
  if (!logo) die("give a logo (SVG or PNG), or --regenerate <brand.json>; --help for usage");
  if (!existsSync(logo)) die(`${logo}: no such file`);
  const ds = o["design-system"];
  if ((ds || o.default) && !o.out) die("--design-system and --default need --out");
  if (o.default && !ds) die("--default sets the theme's appearance; give --design-system too");
  const shared = designSystems().map((d) => d.name);
  if (ds && !shared.includes(ds)) die(`--design-system ${ds}: not a shared design system; choose one of ${shared.join(", ")}`);
  if (o.default && !["light", "dark"].includes(o.default)) die(`--default ${o.default}: use light or dark`);
  const r = await generateFromFile(logo, readSettings());
  for (const c of r.clamped) warn(`${c.name} ${c.given} is outside ${SETTINGS[c.name].min}–${SETTINGS[c.name].max}; used ${c.used}`);
  for (const w of r.warnings) warn(w);
  for (const w of r.withheld) warn(`${w.label} withheld: ${w.withheld.join("; ")}`);

  if (o.json) { console.log(JSON.stringify({ analysis: r.analysis, options: r.options, clamped: r.clamped, warnings: r.warnings }, null, 2)); }
  else {
    console.log(`extracted: ${r.analysis.candidates.map((c) => `${c.hex} (${Math.round(c.share * 100)}%)`).join(", ") || "none (monochrome)"}\n`);
    const rows = r.options.map((x) => {
      const L = x.brand.appearances.light?.color, D = x.brand.appearances.dark?.color;
      const flagged = x.moves.filter((m) => m.flagged).length;
      return [x.label, L?.structure.$value ?? "-", L?.accent.$value ?? "-", D?.structure.$value ?? "-", D?.accent.$value ?? "-", `${x.moves.length}${flagged ? ` (${flagged} flagged)` : ""}`];
    });
    const head = ["option", "light button", "light accent", "dark button", "dark accent", "moves"];
    const w = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
    for (const row of [head, ...rows]) console.log(row.map((c, i) => c.padEnd(w[i])).join("  "));
  }

  if (!o.out) return;
  const pick = o.strategy ? r.options.find((x) => x.label === o.strategy) : r.options[0];
  if (!pick) die(`--strategy ${o.strategy}: no such option; choose one of ${r.options.map((x) => x.label).join(", ")}`);
  const out = resolve(o.out);
  const name = o.name ?? basename(out).replace(/\.brand\.json$|\.json$/, "");
  if (!NAME.test(name)) die(`brand name "${name}" must be lower-case words joined by hyphens; use --name`);
  const posix = (p) => p.split("\\").join("/");
  const inRepo = !relative(ROOT, out).startsWith("..");
  // $schema points at the schema folder beside brands/ when there is one (a tokens/ tree), else at this repo's.
  const schemaFor = (file, kind) => {
    const dir = dirname(out), local = join(dirname(dir), "schema", `${kind}.schema.json`);
    const target = basename(dir) === "brands" && existsSync(local) ? local : inRepo ? join(ROOT, `tokens/schema/${kind}.schema.json`) : null;
    return target ? { $schema: posix(relative(dirname(file), target)) } : {};
  };
  const doc = {
    ...schemaFor(out, "brand"),
    $description: `Generated by @ux-builder/engine ${pick.brand.generation.engine} from ${basename(logo)}, strategy ${pick.strategy} (option "${pick.label}"). Regenerate with: npm run brand -- --regenerate ${inRepo ? posix(relative(ROOT, out)) : out}`,
    name,
    title: o.title ?? name.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
    appearances: pick.brand.appearances,
    generation: {
      ...pick.brand.generation,
      logo: { path: posix(relative(dirname(out), resolve(logo))), sha256: r.analysis.sha256 },
    },
  };
  const show = (p) => { const r = relative(process.cwd(), p); return r.startsWith("..") ? p : r; };
  const brandsDir = dirname(out);
  const themeOut = ds && join(basename(brandsDir) === "brands" ? join(dirname(brandsDir), "themes") : brandsDir, `${name}.theme.json`);
  for (const f of [out, themeOut].filter(Boolean)) if (existsSync(f) && !o.force) die(`${show(f)} exists; use --force to replace it`);
  if (themeOut && !existsSync(dirname(themeOut))) die(`${show(dirname(themeOut))}: no such folder for the theme file`);
  if (o.default && !pick.brand.appearances[o.default]) die(`--default ${o.default}: the brand has no ${o.default} appearance`);

  writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");
  console.error(`\nwrote ${show(out)} (brand, option "${pick.label}")`);
  if (!themeOut) {
    console.error(`no theme yet: preview the brand on every design system, then rerun with --design-system <${shared.join("|")}>`);
    return;
  }
  const theme = {
    ...schemaFor(themeOut, "theme"),
    $description: `${doc.title}: the ${name} brand on the ${ds} design system. Generated with npm run brand.`,
    name,
    title: doc.title,
    brand: name,
    ...(o.default && { default: o.default }),
    designSystem: ds,
  };
  writeFileSync(themeOut, JSON.stringify(theme, null, 2) + "\n");
  console.error(`wrote ${show(themeOut)} (theme: select it with data-theme="${name}")`);
  // The SDK's catalogue and agent guidance list every theme; keep them current (npm run check fails otherwise).
  if (resolve(dirname(themeOut)) === resolve(ROOT, "tokens/themes")) {
    execFileSync(process.execPath, [join(ROOT, "tools/gen-catalogue.mjs")], { cwd: ROOT, stdio: "ignore" });
    console.error("updated packages/ui/catalogue.json and the agent guidance");
  }
}
