import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { after, test } from 'node:test';
import { generate } from '../../tools/plugin-package.mjs';
const root = fileURLToPath(new URL('../..', import.meta.url));
const temp = realpathSync(mkdtempSync(join(tmpdir(), 'ux plugin test ')));
after(() => rmSync(temp, { recursive: true, force: true }));
const bundle = join(temp, 'installed plugin');
cpSync(join(root, 'plugin'), bundle, { recursive: true });
const runner = join(bundle, 'scripts/run.mjs');
const app = join(temp, 'consumer app');
mkdirSync(app);
writeFileSync(join(app, 'package.json'), '{"private":true}');
const run = (...args) => spawnSync(process.execPath, [runner, ...args], { cwd: app, encoding: 'utf8' });

function fakePackage(name, bin, version = '9.9.9') {
  const dir = join(app, 'node_modules', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version, exports: { './package.json': './package.json' }, bin: bin ? { [bin]: 'cli.mjs' } : {} }));
  writeFileSync(join(dir, 'cli.mjs'), 'console.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)}));process.exitCode=7;');
}

test('checked-in plugin output matches canonical skills, versions and manifests', () => {
  generate(true);
  for (const name of ['ux-builder-design', 'ux-builder-ui', 'ux-builder-assess']) {
    const skill = readFileSync(join(bundle, 'skills', name, 'SKILL.md'), 'utf8');
    assert.ok(skill.split(/\s+/).length < 600);
    assert.ok(existsSync(join(bundle, 'skills', name, 'references/workflow.md')));
    for (const link of skill.matchAll(/\]\(([^)]+)\)/g)) assert.ok(existsSync(join(bundle, 'skills', name, link[1].split('#')[0])), link[1]);
  }
  const a = JSON.parse(readFileSync(join(bundle, '.claude-plugin/plugin.json')));
  const b = JSON.parse(readFileSync(join(bundle, '.codex-plugin/plugin.json')));
  for (const k of ['name', 'version', 'skills', 'repository', 'description']) assert.equal(a[k], b[k]);
  assert.equal(b.requires_local_executor, true);
  assert.equal(a.mcpServers, undefined);
  assert.equal(b.mcpServers, undefined);
});

test('relocated bundle reports missing dependencies without creating or downloading anything', () => {
  const r = run('doctor', 'design');
  assert.equal(r.status, 1, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).missing, ['@ux-builder/design', '@ux-builder/ui']);
  assert.equal(existsSync(join(app, 'node_modules')), false);
  const command = run('design', 'status');
  assert.equal(command.status, 2);
  assert.match(command.stderr, /No package was downloaded/);
});

test('runner uses the consumer binary, preserves cwd, literal arguments and exit status', () => {
  fakePackage('@ux-builder/design', 'ux-builder-design');
  fakePackage('@ux-builder/ui', 'ux-builder-blueprint');
  const r = run('design', 'status', 'argument with spaces', '$(do-not-execute)');
  assert.equal(r.status, 7, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), { cwd: app, args: ['status', 'argument with spaces', '$(do-not-execute)'] });
  const report = run('doctor', 'design');
  assert.equal(report.status, 0, report.stderr);
  const data = JSON.parse(report.stdout);
  assert.equal(data.packages['@ux-builder/design'].version, '9.9.9');
  assert.ok(data.warnings.some((w) => /installed 9.9.9/.test(w)));
  assert.ok(data.packages['@ux-builder/design'].manifest.startsWith(app));
});

test('doctor detects project-local duplicates in both host layouts', () => {
  const path = join(app, '.agents/skills/ux-builder-ui/SKILL.md');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, 'custom guidance');
  const data = JSON.parse(run('doctor', 'design').stdout);
  assert.deepEqual(data.localSkills, [path]);
  assert.ok(data.warnings.some((w) => /Custom skills must be preserved/.test(w)));
  assert.equal(readFileSync(path, 'utf8'), 'custom guidance');
});

test('starter postinstall honors persistent plugin mode without overwriting local guidance', () => {
  const script = join(root, 'packages/create-app/template/scripts/install-skill.mjs');
  const original = 'custom local guidance';
  const target = join(app, '.claude/skills/ux-builder-ui/SKILL.md');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, original);
  const source = join(app, 'node_modules/@ux-builder/ui/skill/ux-builder-ui/SKILL.md');
  mkdirSync(dirname(source), { recursive: true });
  writeFileSync(source, 'package guidance');
  mkdirSync(join(app, '.ux-builder'), { recursive: true });
  writeFileSync(join(app, '.ux-builder/skills.json'), '{"source":"plugin"}');
  let r = spawnSync(process.execPath, [script], { cwd: app, encoding: 'utf8', env: { ...process.env, UX_BUILDER_SKILLS: '' } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(target, 'utf8'), original);
  writeFileSync(join(app, '.ux-builder/skills.json'), '{"source":"project"}');
  r = spawnSync(process.execPath, [script], { cwd: app, encoding: 'utf8', env: { ...process.env, UX_BUILDER_SKILLS: '' } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(target, 'utf8'), 'package guidance');
});
