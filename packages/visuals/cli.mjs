#!/usr/bin/env node
/* ux-builder-visuals (CONTRACT-009 Command): render a batch of umf.visual documents in one process.

     ux-builder-visuals render <doc.json>… --theme <name> [--appearance light|dark|both]
         [--output svg|mermaid|plate|presentation|all] [--width <px>] [--out <dir>] [--check] [--report]

   Writes <out>/<visual id>.{svg,mmd,plate.html,presentation.html} (and .layout.json with --report);
   the portable form is <id>.md, a Markdown table, for the kinds Mermaid has no diagram for,
   prints a JSON summary, and exits 1 when a document is refused or, with --check, a drawing fails. */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { check, loadTheme, render } from "./node.mjs";
import { createTheme } from "./src/theme/theme.mjs";

const USAGE = "usage: ux-builder-visuals render <doc.json>… --theme <name> [--appearance light|dark|both] [--output svg|mermaid|plate|presentation|all] [--width <px>] [--out <dir>] [--check] [--report]";
const EXT = { svg: "svg", mermaid: "mmd", plate: "plate.html", presentation: "presentation.html" };

export async function main(argv) {
  let parsed;
  try { parsed = parseArgs({ args: argv, allowPositionals: true, options: {
    theme: { type: "string" }, appearance: { type: "string", default: "light" }, output: { type: "string", default: "svg" },
    width: { type: "string" }, out: { type: "string", default: "." }, check: { type: "boolean", default: false },
    report: { type: "boolean", default: false }, help: { type: "boolean", short: "h", default: false },
  } }); }
  catch (error) { return { code: 2, stdout: "", stderr: `${error.message}\n${USAGE}\n` }; }
  const { values, positionals } = parsed;
  const [command, ...files] = positionals;
  if (values.help || command !== "render" || !files.length || !values.theme) return { code: values.help ? 0 : 2, stdout: "", stderr: USAGE + "\n" };
  const outputs = values.output === "all" ? Object.keys(EXT) : [values.output];
  if (outputs.some((o) => !EXT[o])) return { code: 2, stdout: "", stderr: `Unknown output ${values.output}\n${USAGE}\n` };
  if (!["light", "dark", "both"].includes(values.appearance)) return { code: 2, stdout: "", stderr: `Unknown appearance ${values.appearance}\n${USAGE}\n` };
  const width = values.width === undefined ? undefined : Number(values.width);
  if (width !== undefined && !(Number.isFinite(width) && width > 0)) return { code: 2, stdout: "", stderr: `--width must be a positive number of pixels, not ${values.width}\n${USAGE}\n` };
  let resolved, theme;
  try { resolved = loadTheme(values.theme, values.appearance); theme = createTheme(resolved, values.appearance); }
  catch (error) { return { code: 2, stdout: "", stderr: `${error.message}\n${USAGE}\n` }; }
  mkdirSync(values.out, { recursive: true });
  const summary = { theme: values.theme, appearance: values.appearance, rendered: [], refused: [] };
  const seen = new Map();
  for (const file of files) {
    let document;
    try { document = JSON.parse(readFileSync(file, "utf8")); }
    catch (error) { summary.refused.push({ file, code: "VISUAL_READ", message: error.message, diagnostics: [] }); continue; }
    const id = document?.extensions?.["umf.visual"]?.id;
    if (id !== undefined && seen.has(id)) { summary.refused.push({ file, id, code: "VISUAL_DUPLICATE_ID", message: `${id} was already rendered from ${seen.get(id)}; its files would be overwritten`, diagnostics: [] }); continue; }
    if (id !== undefined) seen.set(id, file);
    const entry = { file, id, files: [], warnings: [], findings: [] };
    try {
      for (const output of outputs) {
        // "all" writes the plate and the presentation only where they apply.
        if (values.output === "all" && output === "presentation" && !document.extensions["umf.visual"].steps?.length) continue;
        const r = await render(document, { theme: resolved, appearance: values.appearance, output, width });
        const target = join(values.out, `${id}.${output === "mermaid" && r.format === "markdown" ? "md" : EXT[output]}`);
        writeFileSync(target, r.content);
        entry.files.push(target);
        if (output === "svg" || outputs.length === 1) {
          entry.warnings = r.warnings;
          if (values.check) entry.findings = check(r.layout, { theme });
          if (values.report) { const rep = join(values.out, `${id}.layout.json`); writeFileSync(rep, JSON.stringify(r.layout, null, 2) + "\n"); entry.files.push(rep); }
        }
      }
      summary.rendered.push(entry);
    } catch (error) {
      summary.refused.push({ file, id, code: error.code ?? "VISUAL_ERROR", message: error.message, diagnostics: error.diagnostics ?? [] });
    }
  }
  const failed = summary.refused.length > 0 || summary.rendered.some((r) => r.findings.length);
  return { code: failed ? 1 : 0, stdout: JSON.stringify(summary, null, 2) + "\n", stderr: "" };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("ux-builder-visuals")) {
  const r = await main(process.argv.slice(2));
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  process.exitCode = r.code;
}
