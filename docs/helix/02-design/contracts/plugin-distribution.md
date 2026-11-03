# Contract: plugin distribution

**Type**: CLI and configuration boundary. **Version**: 1.
**Related**: CONTRACT-008, [distribution design](../plugin-distribution.md).

## Purpose

Distribute existing UX Builder workflows for Claude Code and Codex, with project
runtime resolution and an explicit choice of skill installation source.

## Scope and Boundaries

UX Builder owns `plugin/`; HELIX owns its marketplace listing. The bundle MUST
include its manifests, three skills, references and runner. It MUST NOT require
files outside the bundle for discovery, or install npm dependencies on enablement.

## Normative Surface

From the consumer cwd with Node.js 20+, `node <plugin>/scripts/run.mjs` supports:

| Command | Behavior |
|---------|----------|
| `doctor [design\|ui\|assess]` | Read-only JSON report of project, workflow, readiness, Node version, packages, missing packages, local skills, warnings and setup instructions. Omission checks all packages. Each installed package reports version, tested version, manifest path, binaries, and skill path when applicable. |
| `design <args>` | Execute the consumer's `@ux-builder/design` binary `ux-builder-design`. |
| `blueprint <args>` | Execute the consumer's `@ux-builder/ui` binary `ux-builder-blueprint`. |
| `audit <args>` | Execute the consumer's `@ux-builder/audit` binary `ux-builder-audit`. |
| `trace <args>` | Execute the consumer's `@ux-builder/trace` binary `ux-builder-trace`. |

Arguments MUST remain literal and cwd MUST remain the consumer project. No
command MAY fetch a missing executable or resolve against the plugin's packages.
Doctor's design prerequisites are design and ui; UI prerequisites are ui, tokens,
audit and trace; assessment prerequisites are audit and ui. Full doctor checks
all five. A version difference MUST be reported; it does not establish API
compatibility. Canonical documentation for the installed version takes precedence.

## Precedence and Compatibility

For design initialization and the starter's postinstall skill copier, the source
is `UX_BUILDER_SKILLS`, then `.ux-builder/skills.json` field `source`, then
`project`. Supported values are `project` and `plugin`. Plugin initialization
MUST persist `{"source":"plugin"}` and MUST NOT copy a project-local skill.
Postinstall MUST skip copies in plugin mode. Default behavior remains project
mode. These operations MUST NOT delete existing local guidance. The plugin doctor
MUST report local UX Builder skills in both `.claude/skills` and `.agents/skills`.

Plugin and npm versions are independent. Host manifest versions MUST agree.
Generation MUST record the npm versions behind its reference snapshots. The
marketplace MUST point at a tested Git revision; a moving development branch is
not a release pin. MCP is optional and separately configured by the consumer.

## Error Semantics

Doctor exits 0 when workflow prerequisites and Node version are present, else 1.
Invalid workflow/command, malformed manifests or missing executable exit 2 with
a diagnostic. An executed binary's normal exit status is preserved; launch errors
exit 2 and a child terminated by signal yields 1. Invalid source selectors or
malformed configuration stop initialization/postinstall rather than guessing.

## Examples

```sh
node /path/to/plugin/scripts/run.mjs doctor design
node /path/to/plugin/scripts/run.mjs design status
UX_BUILDER_SKILLS=plugin ux-builder-design init
```
