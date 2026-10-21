---
ddx:
  id: ADR-026
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: ADR-025
    - kind: informs
      to: FEAT-009
    - kind: informs
      to: CONTRACT-004
    - kind: informs
      to: CONTRACT-006
---

# ADR-026: The UX assessment binds HELIX for intent, inspects the agent's own browser, and only proposes

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-20 | **Accepted** 2026-10-20 (operator: pilot on the theme builder; a shared browser over CDP; build increment 1 and the state proof first; manifest `ux-assessment.yml`; "make sure the manifest aligns with HELIX so it knows where to find HELIX documents") | Operator | FEAT-004, FEAT-008, ADR-025, CONTRACT-004, CONTRACT-006 | Medium |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | The audit checks SDK conformance and selected rules at URLs it opens itself. It cannot tell what an app is for, which journeys matter, which tests describe its behaviour, or what a screen looks like midway through a task. UX reviews of prototypes are ad hoc, untraceable and hard to verify. |
| Current State | `audit()` launches its own Chromium and context, visits URLs, switches every theme and appearance, and writes HTML, JSON and marked screenshots (CONTRACT-004). It has a findings baseline and rule IDs (ADR-025). The MCP server serves the SDK catalogue from the copy installed beside it. HELIX documents an app's intent: a `.helix.yml` marker selects a flow and its root, and each artifact type's `meta.yml` gives its location, naming, ID format and template. |
| Requirements | The planning brief of 2026-10-20 (UA-F01 to UA-F09) and the operator's answers recorded above. |
| Decision Drivers | (1) Intent comes from HELIX, never from a second copy of the requirements. (2) A check must see the state the agent reached. (3) Agent judgment, deterministic results and real-user evidence must stay distinct. (4) The assessment must not change code or governing documents. (5) No new agent runtime or mandatory MCP server for V1. (6) Prove the risky part (same-state inspection) before scaling journeys. |

## Decision

1. **The assessment extends `@ux-builder/audit`.** Its deterministic
   operations are `ux-builder-audit assess` subcommands and library exports
   of the same package; no new package.
2. **The manifest binds HELIX; it does not describe it.** `ux-assessment.yml`
   (YAML, `version: 1`, a JSON Schema in the package) sits at the app's
   root. Its `helix` section names the marker, the flow and the catalogue
   source; documents are then found as HELIX finds them: instances under
   the flow's `root:`, typed by `ddx.type` or by the catalogue's
   `output.location` and `output.naming`, identified by `ddx.id`, linked by
   `ddx.links` and `ddx.depends_on`. Flow resolution and marker refusal
   follow HELIX's own rules. The catalogue binds in HELIX's order (marker
   pointer, vendored `workflows/`, installed plugin, explicit path), and the
   run records which source and version bound. Optional globs only narrow
   within the root. The manifest also holds what HELIX does not: how to run
   and reach the app, journeys' roles and fixtures, test commands,
   credentials by reference, limits and restrictions.
3. **Context, traceability and baseline are commands.** `assess init`,
   `validate`, `collect` and `baseline` are deterministic, run on their own
   and write JSON under the manifest's output path (CONTRACT-006).
4. **Inspection is page-level, and the browser is shared over CDP.** The
   audit's checks move into `inspect(page, options)`, which never
   navigates or resets state; `audit()` becomes a loop that opens pages and
   calls it. For walkthroughs, `assess browser` starts a Chromium with a
   Chrome DevTools Protocol endpoint; the agent's browser driver (Playwright
   MCP with `--cdp-endpoint`, or any CDP client) connects to it; `assess
   inspect --cdp` attaches with `chromium.connectOverCDP` and inspects the
   matching page in place. Where a driver cannot share its browser, a
   replay adapter reproduces the state from recorded steps and asserts it
   before inspecting. Checks that change the page (theme switches,
   resizes, focus moves, Escape) are declared state-affecting, skipped by
   default, and run only in a restoring pass.
5. **The agent reasons; the skill guides it.** A companion skill,
   `ux-builder-assess`, ships in `@ux-builder/audit` and prescribes the
   stages. Commands never claim judgments; every finding has a type
   (deterministic, observed, heuristic, SDK adoption, real-user). The MCP
   server is optional; when used from an app, it reads the app's installed
   catalogue first and reports the version it served.
6. **The assessment only proposes.** Proposed changes are patches in the
   output package, each targeting a HELIX artifact by `ddx.id` and type, or
   a new instance named and numbered by its catalogue type and drafted from
   its template; the backlog is proposed as an `improvement-backlog` entry.
   Nothing under the flow's root or the app's source is written. Accepted
   proposals are applied through HELIX, after rechecking revisions.
7. **Safety is configuration, enforced by the commands.** Local or staging
   only; origins and integrations allow-listed; consequential actions
   refused unless authorized; secrets referenced, never stored; evidence
   masked before it is written.
8. **Pilot: the theme builder in this repository.** Its mock model,
   throwaway repository, AI feedback states, validation and server refusal
   make it a safe, deterministic target. It has no sign-in, so the
   signed-in checkpoint of the state proof uses the audit's own fixture.

## Alternatives Considered

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| A new `@ux-builder/assess` package | Clear boundary | A new first publish and trusted publisher; it would duplicate the checks it must share | Rejected: decision 1 |
| Copy journeys and criteria into the manifest | Self-contained | Drifts from HELIX; duplicates the authority | Rejected: driver 1 |
| List document paths and globs in the manifest | Simple | Restates the marker; misses HELIX's typing and IDs; breaks when docs move | Rejected: HELIX already says where documents are |
| Replay first (the audit reproduces every state itself) | One browser owner | Many states (an AI stream, a timed toast) are hard to reproduce; mismatch risk | Kept as the fallback (decision 4) |
| In-process Playwright scripts only | Deterministic | No adaptive walkthrough; the agent cannot explore | Rejected for walkthroughs; used for the proof's tests |
| MCP server as the runtime | One integration | A mandatory server and agent runtime for V1 | Deferred to increment 3 as optional wrappers |
| JSON manifest | Like `app.blueprint.json` | No comments; operator chose YAML | Rejected |

## Consequences

| Type | Impact |
|------|--------|
| Positive | Recommendations trace to HELIX IDs and tests; checks see the real state; the URL audit and checkpoint inspections share one implementation |
| Negative | `@ux-builder/audit` gains a YAML parser dependency and a larger surface; refactoring `audit()` onto `inspect()` touches every check |
| Neutral | The assessment reads a HELIX catalogue that may be newer or older than the one the app's documents follow; the run records both |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| A driver's CDP sharing behaves differently from in-process Playwright (pages, frames) | Medium | High | The state proof (FEAT-009 INS-06) runs against a second CDP client before journeys scale; replay fallback |
| Refactoring onto `inspect()` changes existing findings | Medium | Medium | The existing audit suite must pass unchanged; findings are compared before and after |
| The HELIX catalogue or marker evolves | Medium | Low | Bind by HELIX's resolution order; record source and version; unknown keys ignored |
| Proposals read as decisions | Low | Medium | Proposals are patches outside the root; HELIX applies them |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| The three-checkpoint proof passes; the existing audit suite passes unchanged on `inspect()` | A driver that cannot expose CDP becomes the common case; HELIX changes its marker or catalogue resolution |

## Concern Impact

No concern slot changes. `e2e-playwright` covers the inspection proof.

## References

- *UX Builder HELIX-aware UX assessment: feature and user-story planning brief*, 2026-10-20.
- HELIX at `e8a8c7d`: `workflows/artifact-schema.md`, `workflows/graph.yml`, the artifact types' `meta.yml`, and the marker design (`.helix.yml`).
- Playwright `chromium.connectOverCDP`; Playwright MCP `--cdp-endpoint`.
