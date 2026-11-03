# Build plan: HELIX marketplace distribution

## Scope

Implement the operator-authorized two-PR scope in
[the distribution design](../02-design/plugin-distribution.md), preserving the
existing UX workflows, package versions, approval rules and project defaults.

## Shared Constraints

No automatic npm installation, MCP startup, SDK adoption or release publication.
Source skills remain canonical; generated plugin output is checked for drift.
No tracker changes. No history rewriting. Custom project skills remain intact.

## Implementation Slices

1. Add portable plugin manifests, generated entrypoints/references and a local
   package runner. Validate with `npm run plugin:check` in a relocated fixture.
2. Add persistent explicit plugin selection to initializer and postinstall;
   validate both modes and preserve custom files. Run design and starter suites.
3. Add installation/release documentation, Changeset, and CI integration through
   `npm run check`; validate generated snapshots and host manifest discovery.
4. Open the ux-builder PR. In HELIX, add its pinned Git-subdirectory listing,
   replace positional marketplace assumptions with name lookup, add regression
   tests and install guidance. Run `just test` and `git diff --check`.
5. Open the dependent HELIX PR as draft. Merge/release and real marketplace
   installation remain operator follow-through; pin the released revision before
   marking that PR ready.

## Execution Contract

The operator authorized implementation and both PRs. Complete code, docs, tests,
commits and pushes within this scope. No spending ceiling or token budget was
specified; runtime metering is unavailable. No additional agents are required.

## Validation Plan

Packaging tests must prove self-contained discovery, local-only resolution,
missing prerequisites, literal arguments, exit status, version reporting and
coexistence. Existing SDK gates remain enabled. Record unavailable host/runtime
checks as limitations rather than success. Run the complete project check where
the local environment supports it; CI remains the merge gate.

## Risks and Rollbacks

Installed-version drift is handled by version reporting and local documentation.
Roll back by disabling the plugin or reverting its listing; project-mode setup
continues to work. Restore generated local skills only from installed packages.

## Continuation Evidence

Implementation in progress. Packaging and coexistence fixtures are implemented;
full SDK checks, host validation, commits and both PRs remain. Final PR descriptions
will record exact test results and release/merge ordering.
