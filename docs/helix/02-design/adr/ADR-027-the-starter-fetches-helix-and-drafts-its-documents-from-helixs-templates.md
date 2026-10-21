---
ddx:
  id: ADR-027
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: ADR-026
    - kind: informs
      to: FEAT-010
    - kind: informs
      to: CONTRACT-004
---

# ADR-027: The starter fetches the latest HELIX release and drafts the app's documents from its templates

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-21 | **Accepted** 2026-10-21 (operator: "the create-app package should automatically infuse the latest helix version … it creates the helix file structure and required artifacts"; fetch at create time; a prefilled starter set; documents first) | Operator | FEAT-004, FEAT-008, FEAT-009, ADR-026, CONTRACT-004 | Medium |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | New apps start without product documents, so nothing governs what is built next and the UX assessment (FEAT-009) has nothing to read. HELIX must be found, installed and its templates filled by hand. |
| Current State | The starter writes a React + Vite app, its lint, audit and blueprint, and agent guidance. HELIX is released on GitHub (v0.18.0 on 2026-10-19) with a Claude plugin package (`helix-plugin-package-<tag>.tar.gz`: the plugin manifest, the `helix` skill and its `references/` catalogue floor); it is not on npm. HELIX's install guide says an adopting project needs only `.helix.yml` and its documents, and that the skill may be installed per project. |
| Requirements | FEAT-010. |
| Decision Drivers | (1) The latest HELIX, not one frozen in create-app. (2) Creation must work offline. (3) Documents must follow the installed HELIX's own templates and pass its reading (FEAT-009 HLX-04). (4) Nothing downloaded is executed. (5) No invented product content. |

## Decision

1. **Fetch the latest release at create time.** The starter asks GitHub for
   `DocumentDrivenDX/helix`'s latest release (or the tag `--helix-version`
   names), downloads its plugin package, and verifies it: SHA-256 against the
   asset's published digest when GitHub gives one, the manifest's version
   against the tag, and the presence of the skill and catalogue floor. An
   environment override of the API base (`UX_BUILDER_HELIX_API`) points tests
   at a local release server.
2. **The plugin package is the unit.** It is HELIX's own packaging of the
   skill with its catalogue; the starter does not assemble HELIX from source.
3. **Install it as a project skill.** `skills/helix/` from the package goes to
   `.claude/skills/helix/` in the app, with `HELIX-VERSION.json` recording its
   provenance and the marker's advisory `version`. The app commits it, so the
   team shares one HELIX version until it chooses to update.
4. **Bundle a fallback.** Each create-app release ships, in `helix/`, the
   plugin package of the HELIX release that was latest when it was
   published (fetched by its `prepack` script, verified the same way). It is
   used offline, on `--helix-offline`, or when the fetch fails, never
   silently.
5. **Draft from the installed templates.** Each starter document is the
   installed release's `template.md` for its type, at the type's
   `output.location` and `output.naming`, with `ddx:` frontmatter. The
   starter's content is placed by heading: it replaces the placeholder text
   of the sections it fills and leaves the rest as the template wrote it.
6. **Prefill only facts.** The app's name and theme, its stack as concern
   choices, the starter screen as FEAT-001 and US-001, the theme and patterns
   as `DESIGN.md`, and the checks as the test plans. Purpose, users, goals,
   metrics and scope stay placeholders.
7. **Wire the rest.** A `ux-assessment.yml` bound to the marker, a Playwright
   test citing US-001, and guidance that puts HELIX first in the order of work.
8. **Extract safely; never block.** Only regular files under the package's
   root are written; any unsafe entry rejects the package. Only a pinned
   version that cannot be had stops creation.

## Alternatives Considered

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| Bundle only, at create-app release | No network | Lags HELIX between releases | Kept as the fallback (decision 4) |
| Marker and documents only; user installs HELIX | Nothing copied | The agent has no HELIX until someone installs it; the documents follow no particular version | Rejected: driver 1 |
| Clone HELIX's repository | Everything | Large; source layout, not the package HELIX ships | Rejected: decision 2 |
| Run `claude plugin install` | HELIX's documented route | Needs the Claude CLI and a user-wide install; not every machine has it | Mentioned in guidance for user-wide installs |
| Copy HELIX's templates into create-app | Simple | Drifts from HELIX (driver 3) | Rejected |
| Fill the vision and PRD by asking questions | Richer documents | The operator chose a prefilled set; the agent can frame later | Not now |

## Consequences

| Type | Impact |
|------|--------|
| Positive | Every new app is HELIX-governed and assessable on day one, on current HELIX |
| Negative | Creation makes a network request by default; create-app grows by the bundled package (under 1.5 MB); a HELIX template change can change new apps' documents |
| Neutral | The app carries HELIX in `.claude/skills/helix/` and updates it deliberately |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| GitHub rate limits or outages | Medium | Low | Bundled fallback; `GITHUB_TOKEN` honoured |
| A HELIX release changes its package layout | Low | Medium | The contents check fails closed to the bundled copy; a test against the real latest release in the starter e2e |
| A template changes its headings | Medium | Low | Heading merge (decision 5); missing headings appended |
| A compromised release | Low | High | Digest check against GitHub's published digest; nothing executed; package contents limited |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| New apps' `assess collect` has 0 warnings | HELIX changes its packaging or marker |

## Concern Impact

No slot change for ux-builder itself. New apps select `react-vite`
(frontend framework) and `e2e-playwright` (e2e framework) as recorded
choices, activate `packaged-design-system`, `a11y-wcag-aa` and
`ux-interaction-patterns`, and record the language runtime as an assumption
(HELIX has no Node concern).

## References

- HELIX `docs/install/README.md` and release v0.18.0's assets (checked 2026-10-21).
- FEAT-009 HLX-01 to HLX-06 (how the assessment reads HELIX).
