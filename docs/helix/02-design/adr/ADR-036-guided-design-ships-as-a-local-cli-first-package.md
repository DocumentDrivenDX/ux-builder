---
ddx:
  id: ADR-036
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-030
    - kind: informed_by
      to: ADR-035
    - kind: informs
      to: CONTRACT-008
    - kind: informs
      to: ADR-042
    - kind: informs
      to: SD-006
---

# ADR-036: Guided design ships as a local, CLI-first package, with its new artifacts in ux-builder for now

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-23 | **Accepted** 2026-10-23 (operator: accepted FEAT-018's proposed decisions D-3, D-4, D-8 and D-9; "MCP should be optional for this new 'design' package"; "implement this in two stages", new artifact templates and prompts in ux-builder first, HELIX after the concept is tested) | Operator | FEAT-018, ADR-030, ADR-035, CONTRACT-008, SD-006 | Medium |

## Context

FEAT-018 adds a guided design loop: an agent leads a person through
defining, exploring, experiencing and validating an app's UX, with
checkpoints where the person decides. It needs a skill, new artifact types
with templates and prompts, a design state that survives sessions, and
commands for the deterministic work.

ux-builder's packages today:
- `@ux-builder/ui` (widgets, patterns, the blueprint and its command) ships
  to browsers;
- `@ux-builder/audit` (the audit and the assessment) depends on Playwright;
- `@ux-builder/mcp` serves the SDK to agents over stdio, but new apps do
  not configure it yet;
- `@ux-builder/trace` records episodes.

HELIX has no types for most of FEAT-018's artifacts. The operator wants to
test the concept in ux-builder before asking HELIX for anything.

## Decision

1. **One new package, `@ux-builder/design`**, a dev dependency. It holds
   the `ux-builder-design` skill, the new artifact types (template, prompt,
   example, `meta.yml` each, in HELIX's shape), the design state's schema
   and the `ux-builder-design` command. Blueprint commands stay in
   `@ux-builder/ui`; assessment additions stay in `@ux-builder/audit`;
   journey events go in `@ux-builder/ui` (ADR-038).
2. **CLI first, MCP optional.** Every capability is a CLI command with
   `--json` and an exported function. The skill drives the CLI through the
   agent's shell and needs no MCP server. MCP tools wrap the same
   functions; a parity test keeps them equal. `create-app --mcp` and
   `init --mcp` write `.mcp.json`; nothing else does.
3. **Local only.** Nothing is hosted. The CLI runs from the app's
   `node_modules`; the MCP server, when used, is a local stdio process. The
   package makes no network request and calls no model: the judgment work
   is the agent's (FEAT-018 *Developer Experience*).
4. **The guide is a ux-builder skill** (D-3). HELIX hands design work to it
   in stage 2 (FEAT-018 H-5); until then the skill reads HELIX's documents
   and changes them only through `propose` patches (ADR-030).
5. **Stage 1 homes.** The new types' templates live in the package under
   `artifacts/<type>/`. The documents they produce live in the app's
   `docs/ux/`, outside `docs/helix/`, each linking the HELIX documents it
   relates to. Jobs and evidence are in `docs/ux/` now and move to the PRD
   in stage 2 (D-4). HELIX's validators never meet an unknown type.
6. **Committed state.** The design state is `.ux-builder/design-state.json`,
   committed with the app beside the trace (D-9).
7. **Alternatives as files.** Each alternative blueprint is
   `app.blueprint.<name>.json`, a complete, checkable blueprint (D-8).
   Choosing one copies it to `app.blueprint.json`; the design state records
   which was chosen and why the others were rejected.

*[Amended 2026-10-24 — FEAT-018 GDL-80, CONTRACT-008 Layout]* The decision stands; the paths moved. The design documents (here `docs/ux/`) are now in `docs/ux-builder/`, and the blueprint and its alternatives (here `app.blueprint.json` and `app.blueprint.<name>.json` at the app's top) in `docs/ux-builder/blueprint/`. An app not yet migrated keeps the old paths until `ux-builder-design migrate`.

*[Amended 2026-10-29 — ADR-042]* Decisions 4 and 5 are replaced. ux-builder writes into HELIX's documents (ADR-042 decision 2) instead of keeping its own types in `docs/ux-builder/`, and HELIX does not hand design work to it (FEAT-018 H-5 withdrawn). Decisions 1 to 3, 6 and 7 stand.

## Alternatives Considered

| Option | Evaluation |
|---|---|
| Put the guide and templates in `@ux-builder/ui` | Ships authoring files to every app's runtime dependency; mixes release cadences. Rejected |
| Put them in `@ux-builder/audit` | Pulls Playwright into every design session. Rejected |
| MCP as the only interface | Agents with a shell would need a server configured first; new apps don't configure one today. Rejected; MCP stays optional |
| A hosted service | Needs sign-in and repository access, and sends app data off the machine, against ADR-023 rule 8. Deferred: no current need |
| New types straight into HELIX | The operator wants the concept tested first. Deferred to stage 2 |
| One blueprint file with an `alternatives` array | Every check and command would need to learn the array; separate files reuse them as they are. Rejected |

## Consequences

| Type | Impact |
|---|---|
| Positive | Works in any agent with a shell; no setup beyond `npm install`; stage 2 is a move of templates and documents, not a rewrite |
| Negative | One more package to version and publish; `docs/ux/` and `docs/helix/` both exist in an app until stage 2 |
| Neutral | Without MCP, the trace's `guidance` events (ADR-035) are not written, so FEAT-016's "fetched then broken" signal is weaker for sessions that skip MCP |
