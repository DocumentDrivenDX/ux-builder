---
ddx:
  id: concerns
  type: concerns
  status: draft
  links:
    - kind: informed_by
      to: prd
---

# Project Concerns

Project Concerns declare active cross-cutting context for downstream work. They
are not principles, requirements, ADRs, test plans, or implementation tasks.

Selected 2026-10-05 during the first frame pass. Slot sources: `operator` (the
operator decided it in conversation), `shipped-default` (HELIX `slots.yml`),
`assumption` (inferred; confirm or override in `concerns.local.yml`).

## Exclusive Slots

| Slot | Filler | Source | Notes |
|------|--------|--------|-------|
| `frontend-framework` | React 19, built with Vite as a library (project-local) | operator | "For now, React but could evolve" (2026-10-05). The shipped default `react-nextjs` does not fit: `@ux-builder/ui` is a component library, not a Next.js app. ADR-016. |
| `language-runtime` | JavaScript ES modules on Node 20+ (project-local) | assumption | Matches the existing packages and tools. The shipped default `typescript-bun` is not used; adopting TypeScript is an open choice, not decided here. `tools/theme_accent.py` (Python 3) is ported in FEAT-002. |
| `e2e-framework` | `e2e-playwright` | shipped-default | Needed by the brand builder (FEAT-003), a UI web app whose core flow must run green end to end. |
| `auth-provider` | Not selected | assumption | No accounts in scope until FEAT-003's hosting is decided; revisit if the brand builder is hosted for clients. |
| `deploy-target` | Not selected | assumption | Packages ship to the public npm registry; the brand builder's host is an open question in the PRD. |
| `datastore`, `architecture-style` | Not needed | assumption | No persistent store; brand files live in git. |

## Active Concerns

| Concern | Source | Areas | Why Active | Key Practices |
|---------|--------|-------|------------|---------------|
| `a11y-wcag-aa` | library | `area:ui`, `area:tokens` | Every theme, generated palette and widget must be readable and operable; the SDK sets accessibility for every consumer | 4.5:1 contrast gate on every text and widget pairing; keyboard and screen-reader behaviour owned by the widgets |
| `e2e-playwright` | library | `area:ui` | The brand builder's core flow (logo to saved brand) must be exercised end to end | ≥ 1 browser e2e over the core flow, green against the running builder |
| `testing` | library | `area:ui`, `area:tokens`, `area:engine` | Palette generation and theme composition are deterministic and must be regression-tested | Golden tests for palette output per logo and strategy; component tests for widgets |
| `verification` | library | all | Galleries and release notes make claims about every theme | No claim in a gallery, changelog or artifact without a passing check behind it |
| `security-owasp` | library | `area:ui`, `area:api` | The brand builder accepts uploaded files and calls the OpenAI API (ADR-019) | Sanitise uploaded SVG before rendering; keep the API key server-side; never send logo files to the model without operator consent |
| `scope-discipline` | library | all | The SDK risks growing into a general design system | Widgets admitted by need (ADR-011); non-goals in the PRD |
| `mcp-server` | library | `area:agent` | FR-21 (agent guidance), FEAT-004 SDK-14, P2 | **Active** (2026-10-06): `@ux-builder/mcp` serves the catalogue, themes, brands, tokens, widgets, icons and guidance over stdio, alongside the shipped instructions (AGENTS.md, the skill) rather than instead of them |

## Project Overrides

| Concern | Practice | Override | Authority |
|---------|----------|----------|-----------|
| `a11y-wcag-aa` | Contrast checked per page | Contrast is checked per token pairing for every theme, before any page exists, and blocks release | ADR-011; `tools/check-contrast.mjs` |

## Area Labels

- `area:tokens` — token source, generators and built outputs
- `area:ui` — widgets, gallery, Storybook, brand builder UI
- `area:engine` — palette generation and theme composition
- `area:agent` — guidance and interfaces for AI coding agents
- `area:infra` — CI, releases, package distribution
- `area:docs` — HELIX artifacts and READMEs

## Concern Conflicts

| Conflict | Resolution |
|----------|------------|
| `a11y-wcag-aa` vs. brand fidelity in palette generation | Accessibility wins: a brand colour is moved along its lightness until it passes, and the distance moved is reported for human review (FR-10, ADR-014) |

## FEAT-008 (2026-10-20)

Interaction and IA rules, blueprint and audit (ADR-025) select no new concern
and fill no slot: the audit checks run on the existing `e2e-framework`
(`e2e-playwright`), and the rules extend `a11y-wcag-aa` with platform
guidance from Apple's HIG and Material 3, restated in the SDK's own words.

## FEAT-009 (2026-10-20)

No new concern and no slot change. `e2e-playwright` remains the e2e
framework: the state-inspection proof uses Playwright in process and over
CDP. `a11y-wcag-aa` is unchanged: the assessment reports that a clean audit
is not proof of full accessibility compliance (FEAT-009 non-functional
requirements). The manifest is YAML, parsed with `yaml` (ISC), which the
licence check covers.
