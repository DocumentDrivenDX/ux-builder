#!/usr/bin/env node
// Generate portable skill entrypoints and reference snapshots from the npm skills.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
export function outputs() {
  const files = {};
  for (const [pkg, name, workflow] of [['design', 'ux-builder-design', 'design'], ['ui', 'ux-builder-ui', 'ui'], ['audit', 'ux-builder-assess', 'assess']]) {
    const source = read(`packages/${pkg}/skill/${name}/SKILL.md`);
    const end = source.indexOf('\n---\n', 4) + 5;
    if (!source.startsWith('---\n') || end < 5) throw new Error(`Invalid frontmatter: ${name}`);
    files[`plugin/skills/${name}/SKILL.md`] = source.slice(0, end) + `\n\n# UX Builder: ${workflow}\n\n1. Resolve this skill's directory, then run \`node <skill-directory>/../../scripts/run.mjs doctor ${workflow}\` from the consumer project's root. Read the installed versions, missing packages, warnings and local skill paths. This command reads files only and never downloads packages.\n2. If prerequisites are missing, show the setup guidance. Install or adopt packages only within the user's authorized scope; preserve the project's package manager and lockfile. Do not use a global tool or let npx download a replacement.\n3. If project-local UX Builder skills exist, use their installed-version guidance instead of loading duplicate workflows. For plugin mode, follow [installation guidance](../../README.md#project-local-skills).\n4. Read the installed package's skill at the path reported by doctor. If it has no skill, use [the packaged workflow snapshot](references/workflow.md), identify its tested versions in [compatibility.json](../../compatibility.json), and check APIs against the installed package. Component props, tokens and rules come from the installed catalogue and AGENTS.md.\n5. Follow that workflow. Run its ux-builder-design, ux-builder-blueprint, ux-builder-audit and ux-builder-trace commands through \`node <skill-directory>/../../scripts/run.mjs design|blueprint|audit|trace <arguments>\`, respectively, from the project root. The runner executes only project-resolved package binaries and preserves their exit status.\n\nHELIX owns governing artifacts. UX Builder keeps its documents in docs/ux-builder/ and state in .ux-builder/; changes to docs/helix/ follow the proposal and approval contract in the workflow. Installing this plugin does not select a UI library or authorize SDK adoption. MCP is optional and is not started by this plugin.\n`;
    files[`plugin/skills/${name}/references/workflow.md`] = source.slice(end).trimStart();
  }
  for (const name of ['LICENSE-MIT', 'LICENSE-APACHE']) files[`plugin/${name}`] = read(name);
  // These are the versions the packaged snapshots describe, independent of plugin version.
  files['plugin/compatibility.json'] = JSON.stringify(Object.fromEntries(['design', 'ui', 'audit', 'trace', 'tokens'].map((p) => { const j = JSON.parse(read(`packages/${p}/package.json`)); return [j.name, j.version]; })), null, 2) + '\n';
  return files;
}
export function generate(check = false) {
  const stale = [];
  for (const [path, content] of Object.entries(outputs())) {
    const target = join(root, path);
    if (check) { if (!existsSync(target) || readFileSync(target, 'utf8') !== content) stale.push(path); }
    else { mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content); }
  }
  if (stale.length) throw new Error(`Plugin package is stale: ${stale.join(', ')}. Run npm run plugin:build.`);
  for (const host of ['.claude-plugin', '.codex-plugin']) {
    const manifest = JSON.parse(read(`plugin/${host}/plugin.json`));
    if (manifest.name !== 'ux-builder' || manifest.skills !== './skills/') throw new Error(`Invalid ${host} manifest`);
    if (manifest.version !== JSON.parse(read('plugin/.claude-plugin/plugin.json')).version) throw new Error('Plugin manifest versions differ');
  }
  const names = readdirSync(join(root, 'plugin/skills')).sort();
  if (names.join(',') !== 'ux-builder-assess,ux-builder-design,ux-builder-ui') throw new Error('Unexpected plugin skills');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { generate(process.argv.includes('--check')); console.log('UX Builder plugin package is current'); }
