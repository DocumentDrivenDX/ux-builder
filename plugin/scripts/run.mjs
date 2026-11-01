#!/usr/bin/env node
// Resolve only from the consumer project. Never download a tool or use the plugin's SDK.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tested = JSON.parse(readFileSync(join(root, 'compatibility.json'), 'utf8'));
const commands = { design: ['@ux-builder/design', 'ux-builder-design'], blueprint: ['@ux-builder/ui', 'ux-builder-blueprint'], audit: ['@ux-builder/audit', 'ux-builder-audit'], trace: ['@ux-builder/trace', 'ux-builder-trace'] };
const required = { design: ['@ux-builder/design', '@ux-builder/ui'], ui: ['@ux-builder/ui', '@ux-builder/tokens', '@ux-builder/audit', '@ux-builder/trace'], assess: ['@ux-builder/audit', '@ux-builder/ui'] };

export function inspect(project = process.cwd(), workflow = 'all') {
  if (workflow !== 'all' && !required[workflow]) throw new Error(`Unknown workflow: ${workflow}`);
  const app = resolve(project);
  const req = createRequire(join(app, 'package.json'));
  const packages = {};
  const warnings = [];
  for (const name of Object.keys(tested)) {
    try {
      const manifest = req.resolve(`${name}/package.json`);
      const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
      const dir = dirname(manifest);
      const skillName = { '@ux-builder/design': 'ux-builder-design', '@ux-builder/ui': 'ux-builder-ui', '@ux-builder/audit': 'ux-builder-assess' }[name];
      packages[name] = { version: pkg.version, tested: tested[name], manifest, bin: Object.fromEntries(Object.entries(pkg.bin || {}).map(([key, value]) => [key, resolve(dir, value)])), ...(skillName ? { skill: join(dir, 'skill', skillName, 'SKILL.md') } : {}) };
      if (pkg.version !== tested[name]) warnings.push(`${name}: installed ${pkg.version}; plugin snapshot tested with ${tested[name]}. Read the installed package's guidance.`);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND' && e.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw e;
    }
  }
  const need = workflow === 'all' ? Object.keys(tested) : required[workflow];
  const missing = need.filter((name) => !packages[name]);
  const localSkills = ['.claude', '.agents'].flatMap((host) => ['ux-builder-design', 'ux-builder-ui', 'ux-builder-assess'].map((name) => join(app, host, 'skills', name, 'SKILL.md'))).filter(existsSync);
  if (localSkills.length) warnings.push('Project-local UX Builder skills exist. Use those version-matched skills, or review and remove their generated copies before using the marketplace plugin. Custom skills must be preserved.');
  return { project: app, workflow, ready: !missing.length && Number(process.versions.node.split('.')[0]) >= 20, node: process.versions.node, packages, missing, localSkills, warnings, setup: 'Install the missing packages as project dev dependencies with your package manager and commit its lockfile. Plugin installation does not install npm dependencies. MCP is optional.' };
}

export function main(args = process.argv.slice(2)) {
  const [command = 'doctor', ...rest] = args;
  if (command === 'doctor') {
    const report = inspect(process.cwd(), rest[0] || 'all');
    console.log(JSON.stringify(report, null, 2));
    return report.ready ? 0 : 1;
  }
  const entry = commands[command];
  if (!entry) throw new Error(`Use doctor [design|ui|assess], design, blueprint, audit or trace. Unknown command: ${command}`);
  const report = inspect();
  const bin = report.packages[entry[0]]?.bin[entry[1]];
  if (!bin || !existsSync(bin)) throw new Error(`${entry[0]} and its executable ${entry[1]} must be installed in this project. Run doctor first. No package was downloaded.`);
  const child = spawnSync(process.execPath, [bin, ...rest], { cwd: report.project, stdio: 'inherit', env: process.env });
  if (child.error) throw child.error;
  return child.status ?? 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); } catch (e) { console.error(e.message); process.exitCode = 2; }
}
