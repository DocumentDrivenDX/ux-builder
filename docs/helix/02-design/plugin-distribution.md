# Plugin distribution design

## Scope

The operator requested UX Builder packaging and a companion HELIX marketplace
PR on 2026-10-29. Existing authority is FEAT-018 and CONTRACT-008 (guided design),
FEAT-004 (SDK guidance), and the existing assessment skill. This change distributes
those workflows; it does not change the UX process, UI ownership or approval rules.

## Technical Approach

One independently versioned, skills-only plugin lives in `plugin/`. Its Claude
and Codex manifests point at the same three generated skill entrypoints. Canonical
workflow prose remains in `packages/*/skill/`; `tools/plugin-package.mjs` generates
compact entrypoints and reference snapshots, plus the source package versions.
No MCP server, install hook, npm dependency or app state ships inside the bundle.

HELIX remains the governing artifact catalogue. SDK adoption uses its
`packaged-design-system` concern; it is not implied by enabling the plugin.
UX Builder retains its existing proposal/approval boundary for HELIX documents.

## Component Changes

The distribution generator imports only Node built-ins. The plugin runner also
imports only built-ins and resolves package manifests and binaries from the
consumer cwd, never from the plugin repo. Boundary proof is the relocated-bundle
test with synthetic consumer packages and no plugin node_modules. Existing CLI
modules retain ownership of design, blueprint, audit and trace behavior.

The runner reports installed versions and canonical guidance paths. A different
version is a warning requiring installed-version documentation, not evidence of
compatibility. No automatic npx/global fallback is permitted. MCP stays optional;
its optional design/assessment tools need those packages installed in the app.

The starter retains project-local guidance by default. Explicit plugin mode
persists in `.ux-builder/skills.json`; neither initial design setup nor npm
postinstall then copies local UX Builder skills. Existing/custom copies are
reported and left for an intentional migration, never deleted automatically.

## Interfaces

Host manifests follow the published Claude and Codex plugin formats. The runner,
installation selector and errors are defined in
[the distribution contract](contracts/plugin-distribution.md). There is no new
product domain model or externally stored data. Plugin metadata reuses the host
schemas rather than defining an alternative marketplace schema.

## Security

No network requests, shell interpolation, lifecycle hooks or credential reads
occur in the runner. Consumer binaries are trusted project dependencies and run
with the user's existing shell permissions. Argument arrays preserve literal
input. Installing or adopting packages still needs the user's authorized scope.

## Testing

`npm run plugin:check` proves manifest agreement, generation drift, compact skill
entrypoints, relocated reference resolution, missing prerequisites, consumer-only
binary resolution, argument/exit propagation, duplicate detection and postinstall
selection. The design initializer tests prove plugin selection persists and
avoids local copies. Existing package suites and `npm run check` cover regressions.
Host installation validation and a consumer smoke test precede marketplace release.

## Migration and Rollback

Default project mode is unchanged. Existing projects opt into plugin mode using
the documented selector and review generated local copies before removal. Switch
back to project mode and refresh skills from installed packages to roll back.
Disable/uninstall the plugin without deleting UX documents or design state.

## Release and Risks

The plugin starts at 0.1.0, independent of npm packages; both host manifests must
move together. Npm package changes still use Changesets, whose version command
regenerates plugin snapshots after catalogue generation. The HELIX PR pins a tested
packaging commit and remains draft until this change is merged and released;
no release is published by preparing these PRs. After release, update its source
to the release commit/tag and smoke-test installation from the real marketplace.

Main risk: installed SDK APIs diverge from snapshots. Mitigation: report installed
versions and prefer their guidance. Missing package and browser prerequisites are
explicit failures, not permission to download a different SDK silently.
