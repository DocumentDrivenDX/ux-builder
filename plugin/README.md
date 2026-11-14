# UX Builder plugin

Design, build and assess an app through three skills: `ux-builder-design`,
`ux-builder-ui` and `ux-builder-assess`. Requires a local shell and Node.js 20+.
MCP is optional. Installing this plugin installs guidance, not npm packages.

## Installation

The HELIX marketplace lists this plugin separately from `helix`. Once its
listing is available, Claude Code users run:

```sh
claude plugin install ux-builder --marketplace DocumentDrivenDX/helix
```

Codex users
select UX Builder in the HELIX marketplace. Installing it does not select a
component library or replace a project's existing one.

For development, run `npm run plugin:build` from the repository root, then
`claude --plugin-dir /absolute/path/to/ux-builder/plugin`.

## First use

From the consumer project's root, run:

```sh
node /absolute/path/to/plugin/scripts/run.mjs doctor design
# Other workflows: doctor ui, doctor assess. Without a workflow, check all packages.
```

The report names installed and tested versions, missing packages, local skills,
and installed guidance. Use the project's package manager to add the missing
packages as dev dependencies, within the authorized adoption scope, and commit
its lockfile. A new project can start with `npm create @ux-builder/app`.
The plugin never downloads or installs a runtime itself. Browser-based assessment
also needs the audit package's documented browser setup; video needs ffmpeg.

The project-resolved executable runs through:

```sh
node /absolute/path/to/plugin/scripts/run.mjs design status
node /absolute/path/to/plugin/scripts/run.mjs blueprint check
node /absolute/path/to/plugin/scripts/run.mjs audit doctor
```

Use installed-version guidance when the doctor's version differs from
`compatibility.json`; bundled workflow references are snapshots, not authority
for another SDK's props or tokens. The runner keeps the project's cwd, arguments
and command exit status. It does not fall back to global tools or npx downloads.
The plugin includes no hooks and starts no server. To configure MCP separately,
follow `packages/mcp/README.md` in the source repo and use the project's version.
Design and assessment tools require their corresponding packages in the project.

## Project-local skills

Use one source of UX Builder guidance per project:

- **Project mode (default):** the starter and `ux-builder-design init` install
  skills from the npm packages in `.claude/skills/`. These track the project SDK.
  Use these skills when working in that project, even if the plugin is available.
- **Plugin mode:** set `UX_BUILDER_SKILLS=plugin` when starting the design folder
  or running `ux-builder-design init`. The initializer records
  `{"source":"plugin"}` in `.ux-builder/skills.json` and skips the local design
  skill copy. Subsequent npm installs honor that file and skip skill copies.
  This works in both Claude Code and Codex with the plugin installed.

For an existing initialized project, write the same `.ux-builder/skills.json`
selection. Review existing `.claude/skills/ux-builder-*` and
`.agents/skills/ux-builder-*` copies and remove only generated copies you choose
to replace. Preserve custom instructions. The doctor reports duplicates; neither
the installer nor the plugin deletes them. To return to project mode set
`source` to `project` and run the starter's skill-install script. An environment
selection takes precedence over the file for that invocation.

## Ownership and releases

HELIX owns governing artifacts and its artifact-type catalogue. UX Builder owns
SDK tooling, UX documents in `docs/ux-builder/`, and state in `.ux-builder/`.
HELIX document updates follow the existing proposal and approval workflow.
Adopt the SDK through HELIX's `packaged-design-system` concern and record actual
package versions and component ownership in the project.

The plugin version in both manifests is independent of npm package versions.
For consumer-visible plugin changes, bump both manifests together. Run
`npm run plugin:build`, `npm run plugin:check`, `npm run check`, and host smoke
tests before publishing a plugin release. Package changes still use Changesets;
`version-packages` regenerates the plugin snapshots after npm version changes.
Point marketplace listings at a tested immutable commit or release tag, never an
unreleased moving branch. Do not publish or tag just to prepare a PR.
