---
ddx:
  id: FEAT-010
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-027
---

# Feature Specification: FEAT-010 — A new app starts on HELIX

**Feature ID**: FEAT-010
**Status**: Draft (the document awaits review); specified with ADR-027 and built 2026-10-21 (B-013 to B-016)
**Priority**: P1
**Owner**: Operator
**Covered PRD Subsystem(s)**: App SDK (the starter)
**Covered PRD Requirements**: FR-43, FR-44, FR-45 (drafted with this feature)
**Cross-Subsystem Rationale**: Extends the starter (FEAT-004 SDK-08, SDK-09; FEAT-008 ADP-01) so a new app is governed by HELIX from its first commit and can be assessed (FEAT-009) without setup.

## Overview

`npm create @ux-builder/app` makes a working React + Vite app on ux-builder's
widgets, patterns, lint, audit and blueprint. It does not give the app a
product framework: no vision, no requirements, no stories, and nothing for
the UX assessment to read. This feature makes the starter also start the app
on **HELIX**: it fetches the latest HELIX release when the app is created,
installs HELIX's skill and catalogue into the app, writes the `.helix.yml`
marker, and drafts the starter set of HELIX documents from that release's
own templates, filled in with everything the starter knows and placeholders
for everything only the product's owner can decide.

## Ideal Future State

A developer runs one command and gets an app that runs, lints, audits,
passes its blueprint check, has a vision and PRD to fill in, a feature and
a story that describe the screen it already has, a design-system document
that records the theme and patterns, a test plan, and a Playwright test that
cites the story's criteria. Their coding agent finds HELIX installed in the
project, follows it to frame the next feature, and the UX assessment runs on
day one with every journey traced.

## Problem Statement

- **Current situation**: The starter writes code, guidance and a blueprint
  (FEAT-008), but no product documents. HELIX must be installed separately,
  and its documents written from nothing; the assessment (FEAT-009) cannot
  run until they exist.
- **Pain points**: (1) Teams skip framing and start coding. (2) Agents have no
  governing intent to work from. (3) HELIX versions drift between projects.
  (4) The assessment's manifest cannot be written for a new app.
- **Desired outcome**: Every new app starts HELIX-governed, on the HELIX
  version current that day, with documents that pass HELIX's checks.

## Functional Areas

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Fetch | "Which HELIX does my app get?" | The latest release, verified, at create time; pinned or offline on request |
| Install | "Can my agent use HELIX here?" | HELIX's skill and catalogue installed into the app, with its provenance |
| Documents | "What do I have to write before I start?" | The starter set, drafted from HELIX's templates and prefilled from the starter |
| Wiring | "Does the rest of the toolchain see it?" | A bound assessment manifest, a test citing the story, and guidance that names HELIX |
| Safety | "Is the download safe?" | Verification, extraction limits, nothing executed, creation never blocked by HELIX |

### Terms

- **HELIX release**: a tagged release of `DocumentDrivenDX/helix` on GitHub;
  its asset `helix-plugin-package-<tag>.tar.gz` holds the plugin manifest,
  the `helix` skill and its `references/` floor (the catalogue: graph,
  activities with templates and metadata, concerns, modes, templates).
- **Bundled HELIX**: the plugin package of the release that was latest when
  the create-app version was published, shipped inside create-app.
- **Starter set**: the HELIX documents a new app starts with (HLA-01).

## Requirements

### Functional Requirements by Area

#### Fetch

HLF-01. When an app is created, the starter resolves the latest HELIX
release from GitHub (`DocumentDrivenDX/helix`, latest release) unless
`--helix-version <tag>` names one.

HLF-02. It downloads that release's plugin package and accepts it only if
its SHA-256 matches the digest GitHub publishes for the asset (when GitHub
publishes one), its plugin manifest's version matches the tag, and it holds
`skills/helix/SKILL.md` and the catalogue floor (`references/graph.yml`,
`references/activities/`, `references/concerns/`).

HLF-03. The request uses no credentials unless `GITHUB_TOKEN` is set (read,
never written), honours the standard proxy variables (`HTTPS_PROXY`,
`HTTP_PROXY` and `NO_PROXY`, in upper or lower case), and gives up after 20
seconds.

HLF-04. If the release cannot be fetched or verified, the starter uses the
bundled HELIX and says which version it used and why. `--helix-offline`
uses the bundled HELIX without a network request. A version named with
`--helix-version` that cannot be fetched stops creation (exit 1) and writes
nothing. `--helix-offline` with `--helix-version` is refused (exit 1,
nothing written): they ask for different releases. `--no-helix` creates the
app without HELIX: no marker, documents, skill or `ux-assessment.yml`. The app
still gets `e2e/starter.spec.js` and `npm run test:e2e`, but the test has no
`@covers` lines, because without HELIX there is no US-001.

#### Install

HLI-01. The package's skill, with its catalogue floor, is installed into the
app as a project skill at `.claude/skills/helix/`, so a coding agent in the
project finds HELIX without a user-wide install. Its files are written as
they are in the package.

HLI-02. The app records which HELIX it got: `.claude/skills/helix/HELIX-VERSION.json`
(`{ version, tag, source, digest, fetchedAt, bundled }`) and the marker's
advisory `version` for the flow.

#### Documents

HLA-01. The starter writes `.helix.yml` (flow `helix`, root `docs/helix/`)
and the starter set, each at its catalogue type's output location and
naming, with `ddx:` frontmatter (`id`, `type`, `status: draft`, and the links
the graph expects): product vision, PRD, concerns (with
`concerns.local.yml`), a feature specification (`FEAT-001`) and user story
(`US-001`) for the starter's screen, the design system (`DESIGN.md`), the
project test plan (`TP-001`) and a story test plan (`STP-001`).

HLA-02. Each document is drafted from the fetched release's template for
its type. What the starter knows is filled in: the app's name and theme;
the concerns it implies (frontend framework `react-vite` and e2e framework
`e2e-playwright` as recorded choices, `packaged-design-system`,
`a11y-wcag-aa` and `ux-interaction-patterns` active, the language runtime
recorded as an assumption); the starter's screen as FEAT-001 and US-001,
with acceptance criteria that describe what the screen does; the theme,
navigation and interaction choices in `DESIGN.md`, linked to
`app.blueprint.json`; and the checks the app runs in the test plans.
Everything only the owner can decide (purpose, users, goals, metrics,
scope) stays as the template's placeholder; nothing is invented.

HLA-03. Content is placed by the template's headings: a section the starter
fills replaces the template's placeholder text under that heading; a
section it does not fill keeps the template's text; a heading the starter
fills that a template no longer has is added at the end. A change to a
template in a later HELIX release does not break creation.

HLA-04. The created documents pass the assessment's HELIX reading (FEAT-009
HLX-04): every document is typed by frontmatter, its ID matches its type's
format, every link resolves, and `assess collect` records no warning.

#### Wiring

HLW-01. The app gets a `ux-assessment.yml` bound to its marker, with a
journey for US-001, its test commands and the preview server, which
`assess validate` accepts as created.

HLW-02. The app gets a Playwright test of its starter screen that cites
US-001's criteria with `@covers`, and an `npm run test:e2e` script, so the
assessment's traceability is explicit from the first commit.

HLW-03. The app's `AGENTS.md` and `CLAUDE.md` say that HELIX is installed
(the `helix` skill), where its documents are, and the order of work: frame
or evolve the requirement in HELIX, plan it in the blueprint, build from the
patterns, lint, audit, and assess.

#### Safety

HLS-01. Nothing downloaded is executed. Extraction writes only regular files
under the package's `helix/` root to `.claude/skills/helix/`; an entry with
an absolute path, `..`, a link or a device is refused, and the package with
it.

HLS-02. HELIX never makes creation fail, except a pinned version that cannot
be had or the refused option combination (HLF-04). Every other problem falls
back to the bundled HELIX, with the reason printed and recorded in
`HELIX-VERSION.json`. If the bundled HELIX is missing or fails its own check
when it is needed, the app is created without HELIX, as with `--no-helix`.
The output then gives the reason and says that no `HELIX-VERSION.json` was
written.

### Non-Functional Requirements

- **Time**: fetching and installing HELIX adds under 10 seconds on a normal
  connection. No test measures this.
- **Size**: the bundled HELIX adds under 1.5 MB to the create-app package.
  `helix-fetch.test.mjs` checks it when the bundle is present, which it is
  after `npm pack`, and skips the check otherwise.
- **Determinism**: the same HELIX version and options give the same
  documents, apart from the date. Each document's drafting note carries the
  day it was created; nothing else differs (US-069-AC5).
- **Compatibility**: `--no-helix` gives today's app; the documents follow the
  HELIX version installed, not one fixed in create-app.

## User Stories

- [US-067 — Create an app on the latest HELIX](../user-stories/US-067-create-an-app-on-the-latest-helix.md)
- [US-068 — Create an app offline or on a pinned HELIX](../user-stories/US-068-create-offline-or-on-a-pinned-helix.md)
- [US-069 — Start with the HELIX documents drafted](../user-stories/US-069-start-with-the-helix-documents-drafted.md)
- [US-070 — The new app's documents pass HELIX's reading and are traced](../user-stories/US-070-documents-pass-and-are-traced.md)
- [US-071 — An agent in the new app finds HELIX](../user-stories/US-071-an-agent-finds-helix.md)

## Edge Cases and Error Handling

- **GitHub rate-limited (403/429)**: bundled HELIX, reason "rate limited".
- **A release without a plugin package**: bundled HELIX, reason named.
- **No digest from GitHub for the asset**: the package is accepted on its
  contents check alone, and `digest` records `null`.
- **A template renamed or removed in a later release**: that document is
  written from the starter's own section list with the type's frontmatter,
  and the problem is printed, naming the type (US-069-AC4).
- **The bundled HELIX is missing or unusable when it is needed**: the app is
  created without HELIX, and the reason is printed (HLS-02).
- **A proxy is set**: the requests to GitHub go through it (HLF-03).
- **The target directory exists**: unchanged behaviour: refused.

## Success Metrics

- A new app's `assess collect` reports 0 warnings and its one journey's
  criteria are all explicit.
- 100% of new apps record their HELIX version and source.

## Constraints and Assumptions

- HELIX is distributed as GitHub releases, not on npm (checked 2026-10-21:
  v0.18.0, asset `helix-plugin-package-v0.18.0.tar.gz`).
- HELIX's install guide: an adopting project needs only the marker and its
  documents; the skill may be installed per project.
- The starter is a React + Vite app on Node; HELIX has no Node runtime
  concern, so the language runtime is an assumption, recorded as such.

## Dependencies

- **Features**: FEAT-004 (the starter), FEAT-008 (blueprint), FEAT-009 (the
  assessment's HELIX reading, manifest and traceability).
- **ADRs**: ADR-027.
- **Contracts**: CONTRACT-004 (the starter's options), CONTRACT-006 (the manifest).
- **External**: HELIX releases on GitHub; HELIX's artifact schema and templates.

## Out of Scope

- Updating an existing app's HELIX (a later `helix:update` script).
- Hosts other than Claude Code for the project skill (HELIX's install guide
  covers them; `AGENTS.md` points there).
- Writing the product's vision or requirements for the owner.

## Review Checklist

- [x] Fetch, verify, install and fall back are testable without the network (a local release server).
- [x] Owner decisions stay placeholders.
- [x] Documents come from the installed HELIX's templates, not copies in create-app.

## Evolution *[2026-10-21 — FEAT-014, ADR-032]*

The starter no longer ships the Matters sample. Its starter set's FEAT-001 is
"the app's shell for its modalities" and US-001 is "open the app and see where
to start", with a criterion per chosen modality (FEAT-014 MOD-04, MOD-05).
