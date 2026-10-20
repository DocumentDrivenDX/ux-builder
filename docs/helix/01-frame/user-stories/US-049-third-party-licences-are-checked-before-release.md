---
ddx:
  id: US-049
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-007
    - kind: informed_by
      to: ADR-023
    - kind: informed_by
      to: ADR-017
---

# US-049: Third-party licences are checked before release

**Feature**: FEAT-007 — Generative UI
**Feature Requirements**: LIC-01–05
**PRD Requirements**: FR-31
**Priority**: P1
**Status**: Draft

## Story

**As the** SDK's release owner, and as legal counsel
**I want** every third-party licence the SDK depends on or ships checked automatically, with the notices it requires shipped and nothing that reports usage
**So that** a release cannot break a licence's terms or send its users' usage data to a vendor without anyone deciding to

## Context

Requested by the operator on 2026-10-19 ("check the licenses for all three
and tell me what we need to do"). ADR-023 records the licences as checked
that day: AI Elements Apache-2.0; assistant-ui, CopilotKit and shadcn/ui MIT;
none copyleft. Apache-2.0 asks that copied source keep its notices, changed
files say so, and the licence and any NOTICE travel with it. CopilotKit is
MIT but commercial and reports telemetry; the operator excluded it and ruled
out telemetry altogether the same day, so the check also refuses telemetry
packages (Scarf's install analytics, for one) and unreviewed install scripts.
Fonts are already
checked under ADR-017; this extends the idea to every dependency. The SDK's
own packages declared no licence; they now declare `MIT OR Apache-2.0`
(FEAT-007 open question 1).

## Walkthrough

1. A developer adds a dependency to `@ux-builder/ui` whose licence is GPL-3.0.
2. `npm run check` fails: "`some-lib@2.1.0` (GPL-3.0) is not on the licence
   allow-list; ask counsel for an exception."
3. Another developer copies an AI Elements component into the SDK, records
   it in `licenses/vendored.json`, and removes its copyright header by
   mistake; the check fails naming the file.
4. Before release, each package's `THIRD-PARTY-NOTICES.md` is regenerated.
5. A dependency update pulls in `@scarf/scarf`; the check fails, as it
   reports installs.

## Acceptance Criteria

- [ ] **US-049-AC1** — Given `npm run check` and the release workflow, when they run, then `tools/check-licences.mjs` reads every published SDK package's production, peer and optional peer dependency tree and `licenses/vendored.json`.
- [ ] **US-049-AC2** — Given a dependency whose licence is not MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD or CC0-1.0, or is unknown, missing or `SEE LICENSE IN`, when the check runs, then it fails naming the package, version and licence, unless the package is in the exception list with counsel's approval and a date.
- [ ] **US-049-AC3** — Given vendored third-party source that a package ships, when the check runs, then it fails if a vendored file has lost its copyright notice, a changed file lacks its "Changed by" line, or the licence text or NOTICE file is not shipped in the package's `licenses/`.
- [ ] **US-049-AC4** — Given every SDK package, when the check runs, then it fails on a package without a `license` field, and each published package ships a generated `THIRD-PARTY-NOTICES.md` listing every third-party package and shipped vendored source with its licence (source vendored only for previews, `shipped: false`, is not distributed and not listed; ADR-023 rule 6).
- [ ] **US-049-AC5** — Given a shipped dependency that is a known telemetry package, or that runs an install script without a reviewed exception, when the check runs, then it fails naming the package and the script.
- [ ] **US-049-AC6** — Given a package whose `package.json` licence differs from its LICENSE file, when the check runs, then it fails naming both.

## Edge Cases

- **A dual-licensed package** (`MIT OR GPL-3.0`): passes when one choice is on the allow-list; the notice records the choice.
- **A dev-only dependency** (tests, Storybook): not shipped, so not checked for release, but listed in the check's report.
- **A package with no LICENSE file but a `license` field** (as `@fluentui/svg-icons`): the licence text is kept in `licenses/` from its source, as today.
- **An exception past its review date**: the check warns, then fails after 30 days.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Scope | US-049-AC1 | The workspace | Run check | Every published package's trees and the vendored list read |
| Refuse | US-049-AC2 | A GPL-3.0 dependency; one with no licence | Run | Fails naming each |
| Vendored | US-049-AC3 | A copied Apache-2.0 file without its header | Run | Fails naming the file |
| Own licence | US-049-AC4 | A package without `license` | Run | Fails; notices generated otherwise |
| No telemetry | US-049-AC5 | `@scarf/scarf`; a postinstall script; a reviewed install script | Run | Fails on the first two; the reviewed one passes |
| Mismatch | US-049-AC6 | Field MIT, file GPL | Run | Fails naming both |

## Dependencies

- **Stories**: US-045, US-046
- **Feature Spec**: FEAT-007
- **PRD Requirements**: FR-31
- **External**: counsel's confirmation of the allow-list (ADR-023 rule 7)

## Out of Scope

- Legal advice; the check enforces rules counsel sets.
- Security auditing of dependencies (a separate check).
