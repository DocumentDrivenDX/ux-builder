---
ddx:
  id: ADR-024
  type: adr
  status: proposed
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: ADR-011
    - kind: informed_by
      to: ADR-012
    - kind: informed_by
      to: ADR-016
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-023
    - kind: informs
      to: FEAT-004
    - kind: informs
      to: CONTRACT-004
---

# ADR-024: MCP App views are a generic SDK target; Praxis workflow and server support lives with the harness

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-19 | **Proposed** | Operator; harness team as owner of the Praxis side | ADR-011, ADR-012, ADR-016, ADR-020, ADR-023, FEAT-004, CONTRACT-004 | Medium |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | The operator wants ux-builder to also build Praxis workflows and the apps that run inside the Praxis harness. Two different things are called that. A **workflow** is a harness plug-in: a directory of declarations (`plugin.toml`, `prompt.md`, `evals.jsonl`, optional skills and state prompts) with no UI and no code. An **app** is an MCP server whose tools carry an MCP Apps `ui://` view, rendered by the harness in an opaque-origin sandbox. Only the view is presentation. The rest (manifest schema, tool scoping, denial codes, eval checks, server approval) is the harness's contract. Nothing yet says which of these ux-builder owns, so the line could be drawn inside the SDK's public packages by default. |
| Current State | **ux-builder** is public (`DocumentDrivenDX/ux-builder`, npm `access: public`, MIT OR Apache-2.0). It builds themes, React 19 widgets and patterns, a React + Vite starter (`@ux-builder/create-app`), the audit, lint rules, and an MCP server for coding agents (`@ux-builder/mcp`). It ships the `praxis*` themes as brands, but no code that knows the harness. ADR-011 rule 3 says the token build emits an **MCP Apps mapping** (roles to MCP Apps' standard variable names, plus role variables for what that set lacks). ADR-012 D1 says the harness fills `hostContext.styles` from that mapping. Neither is built: `packages/tokens` exports CSS, resolved JSON, bridges and fonts, and no MCP Apps mapping. `ThemeProvider` accepts resolved `tokens` for an embedded view (CONTRACT-004), but nothing reads them from an MCP Apps host. **The Praxis harness** (a separate, private repository) defines its plug-in manifest (its CONTRACT-002), view host routes (its CONTRACT-006), plug-in tool servers (its CONTRACT-009 and ADR-034, Proposed), and the `io.praxis/pin` extension (ADR-012 D2, owned by the harness team). It authors plug-ins with `python -m praxis plugin new | check | evals | schema | tools | server-digest`. Its view host passes only `hostContext.theme` (the appearance), not `styles`. Its example views (`servers/matter_documents.py`, `servers/view_probe.py`) are hand-written HTML strings. Its own ADR-025 records the consequence: views cannot use its chrome's component library, so visual consistency "depends on mapping praxis tokens onto the MCP Apps style variables, which nothing enforces." The harness chrome consumes the SDK under an earlier private package scope, not as `@ux-builder/*`. |
| Requirements | Operator, 2026-10-19: ux-builder should also be the builder of Praxis-specific workflows and apps that work with the Praxis SDK. Decide the boundary first: what is generic and what is Praxis-specific, and where the Praxis adapter lives. No code before the decision. |
| Decision Drivers | (1) The SDK is public. Client contracts, field names and identities must not ship in it, and its PRD keeps it from becoming a general framework (non-goals: no configuration-driven screens, no data fetching, routing or permissions, ADR-020). (2) The harness contracts change with the harness and are reviewed there; a copy in another repository drifts. (3) An MCP Apps view is the same artefact for any MCP Apps host. Theming it, building it as one sandbox-safe HTML file, and auditing it are not Praxis problems. (4) ADR-011 and ADR-012 already oblige ux-builder to produce the MCP Apps mapping, so part of this work is owed whatever is decided here. (5) Agents building a Praxis app need both sets of rules in one place without either repository copying the other's. |

## Decision

We will make **MCP App views a generic build target of the SDK**, and keep
**everything that knows the Praxis harness in the harness repository**, as a
Praxis adapter that depends on the SDK. ux-builder does not build Praxis
workflows. It builds the views a Praxis app shows, and gives the adapter
extension points to plug into.

### What ux-builder owns (generic, public)

Each item works for any MCP Apps host and names no Praxis contract.

1. **The MCP Apps mapping** that ADR-011 rule 3 already requires: per theme ×
   appearance, the resolved values keyed by MCP Apps' standard style variable
   names, plus the `--piq-*` role values that set lacks, and the theme's font
   faces in the form a host can pass. Exported from `@ux-builder/tokens` beside
   `resolved/`. The contrast gate covers it, as it covers bridges (ADR-023 rule 3).
2. **A view runtime**: an `@ux-builder/ui` entry point that connects to the
   MCP Apps host (`@modelcontextprotocol/ext-apps`, an optional peer
   dependency), applies `hostContext.styles` and `hostContext.theme` through
   `ThemeProvider tokens`, and follows `ui/notifications/host-context-changed`.
   With no styles from the host, it falls back to a theme the view was built with.
   Widgets and patterns are unchanged. A view uses them as an app does.
3. **A single-file view build**: a Vite preset that emits one self-contained
   HTML document (scripts, `ui.css`, theme CSS and fonts inlined; no network
   request; no `eval`) with byte-identical output for identical input. Some
   hosts hash a tool's declaration, including its view HTML, so a
   non-reproducible build would look like a changed definition.
4. **An audit mode for views**: `@ux-builder/audit` renders a built view in a
   mock MCP Apps host, inside an opaque-origin iframe with a deny-all CSP, in
   every theme × appearance × size class. It reports hard-coded values, foreign
   UI, any network attempt, and the bundle's size. The existing lint rules apply
   unchanged.
5. **A `view` starter** in `@ux-builder/create-app`: a view project on the
   preset above, with lint, the audit and CI. It is server-agnostic. Starters
   also accept an **external template** (an npm package or a path), so an
   adapter can supply its own without the SDK knowing it.
6. **Agent guidance** for views in `AGENTS.md`, the skill and `@ux-builder/mcp`
   (`get_guidance` gains a view section). The MCP server describes the SDK and
   does not proxy any host's tooling.

### What the Praxis adapter owns (harness repository)

The harness team owns these. They depend on the SDK and are never published
from ux-builder:

- **Workflows**: the manifest, its JSON Schema, scaffolding, validation and
  evals stay in the harness CLI (`praxis plugin …`). Nothing in ux-builder
  reads or writes `plugin.toml`.
- **Server templates**: a Python MCP App server skeleton that scopes every read
  by `_meta["praxis/scope"]`, refuses calls with the harness's denial codes,
  holds no credential, marks view-only tools `visibility: ["app"]`, embeds the
  view HTML built by the SDK preset, and optionally declares `io.praxis/pin`.
  The SDK's `view` starter (point 5) drives it as an external template.
- **The host side**: the harness view host fills `hostContext.styles` from the
  SDK's MCP Apps mapping (ADR-012 D1) and sends `host-context-changed` on theme
  or appearance switches.
- **Praxis view patterns** (a matter banner, a pin badge, the source-picker
  step of a stateful workflow), if needed. They are built from SDK widgets and
  tokens. A pattern moves into the SDK only under ADR-020's rule, as evidence
  from more than one consumer, renamed to drop Praxis terms.
- **The combined agent skill** for building a Praxis app. It points at
  `@ux-builder/mcp` for presentation and at the harness CLI and contracts for
  the rest. It copies neither.

### The boundary rule

ux-builder's packages may say *Praxis* only as a brand or theme name, and in
documentation as an example consumer. No `praxis/` `_meta` key, `io.praxis/*`
extension, manifest field or denial code appears in SDK code, templates or
guidance. A test in `npm run check` searches the published packages' `dist/`
and templates for these identifiers and fails if it finds one.

**Key Points**: Views are generic: mapping, runtime, single-file build, audit, starter | Workflows, servers, host and Praxis patterns stay in the harness repo | The adapter plugs in through external templates and composed agent guidance | A check keeps harness identifiers out of the public packages

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| **Build Praxis support into the SDK's packages** (create-app `--template praxis`, Praxis tools in `@ux-builder/mcp`) | One install, one place for agents | Ships a private harness contract in a public package; the SDK must release whenever the harness changes its manifest or scoping; against the PRD's non-goals (data, permissions, configuration-driven screens) | Rejected |
| **A `@ux-builder/praxis` package in this repository** | Kept apart from the core packages; reuses this repo's CI and audit | Still public and still a copy of contracts the harness owns; two repositories review one contract; the harness team does not own its own adapter | Rejected |
| **A third repository for the adapter** | Neutral ground; its own release cadence | A third place for the harness contract to drift from; nothing it needs that the harness repository lacks | Rejected |
| **Nothing generic: the harness builds its views by hand** | No SDK work | The current state: hand-written HTML, nothing enforces the theme (praxis ADR-025), and ADR-011/ADR-012's mapping stays unbuilt | Rejected |
| **Generic view target in the SDK; Praxis adapter in the harness repository (selected)** | Every MCP Apps host benefits; the public SDK holds no client contract; the harness owns and reviews its own adapter; the mapping ADR-011 owes gets built | Two repositories to change for one Praxis feature; an extension point (external templates) to keep stable; the harness must move to `@ux-builder/*` or keep a mirror | **Selected** |

## Consequences

| Type | Impact |
|------|--------|
| Positive | A Praxis view is built, themed and audited like any SDK app, and follows theme switches in the harness. Other MCP Apps hosts get the same. ADR-011 rule 3 and ADR-012 D1 can be met. The SDK stays free of client contracts by a check, not by care. Workflow authoring keeps one owner, the harness CLI. |
| Negative | CONTRACT-004 grows: a view entry point, the mapping's export path, the preset and the external-template option all become supported surface. A Praxis app touches two repositories and two release trains. `@modelcontextprotocol/ext-apps` becomes an optional peer dependency whose API is young. Mitigations: the entry point is versioned like the rest of CONTRACT-004, and the peer dependency is pinned to a range the audit's mock host is tested against. |
| Neutral | Which package scope the harness consumes (`@ux-builder/*` or the earlier private scope) is its migration decision, not this one. Plug-in authoring, evals and server approval are unchanged. |

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| MCP Apps renames or adds standard style variables | M | M | The mapping is a generated output (ADR-011); a rename regenerates it. The view runtime reads both the standard names and the `--piq-*` roles. |
| Inlined fonts push views past a host's size budget | M | M | The audit reports bundle size; the preset can leave fonts to the host's `styles.css.fonts` and inline only the faces the theme uses. |
| A Praxis identifier leaks into the SDK through a contributor or an agent | M | H | The boundary check in `npm run check`; guidance names the rule. |
| The external-template hook is too narrow for the harness's server skeleton | M | L | Design the hook against the harness's server template before CONTRACT-004 admits it. Until then the adapter may wrap `create-app` rather than plug into it. |
| The harness keeps consuming the earlier private scope, which falls behind | M | M | Out of scope here. Recorded as a follow-up for the harness team. |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| The harness's `list_documents` view is rebuilt from SDK widgets with the preset. In the harness it switches theme and appearance with the chrome, makes no network request, and passes the view audit in every theme. | The view cannot be themed without a Praxis-specific change to the SDK. |
| The boundary check passes on every release, and a seeded `praxis/scope` string in a template fails it. | A generic feature cannot be expressed without a harness identifier. |
| A second MCP Apps host (a test host counts) renders the same view with no Praxis adapter. | No consumer other than Praxis uses the view target within two releases. If so, reconsider moving it into the adapter. |

## Supersession

- **Supersedes**: None
- **Superseded by**: None

## Concern Impact

- **Concern selection**: none changed.
- **Practice override**: none. `a11y-wcag-aa` applies to views as to apps.
  `security-owasp` applies to the view sandbox assumptions the audit checks
  (no network, no `eval`). ADR-023 rule 8 (no telemetry) applies to the view
  runtime and its peer dependency.

## References

- ADR-011 rule 3 (MCP Apps mapping) and "How a theme reaches an embedded view"
- ADR-012 D1 (`hostContext.styles` from the mapping), D2 and D4 (`io.praxis/pin` owned by the harness team)
- ADR-016, ADR-020 (pattern admission), ADR-023 (bridges; no telemetry)
- PRD, Non-Goals; FEAT-004; CONTRACT-004 (`ThemeProvider tokens`)
- Praxis harness (private): `plugins/README.md`; its CONTRACT-002 (workflow manifest), CONTRACT-006 (view host routes), CONTRACT-009 (plug-in tool server); its ADR-025 (opaque-origin views, "nothing enforces"); `frontend/src/components/ToolView.tsx` (host context passes `theme` only); `servers/matter_documents.py`
- MCP Apps extension (`io.modelcontextprotocol/ui`), `@modelcontextprotocol/ext-apps`

## Review Checklist

- [x] Context names a specific problem
- [x] Decision statement is actionable
- [x] At least two alternatives were evaluated
- [x] Each alternative has concrete pros and cons
- [x] Selected option's rationale explains why it wins over the best alternative
- [x] Consequences include both positive and negative impacts
- [x] Negative consequences have documented mitigations
- [x] Risks are specific with probability and impact assessments
- [x] Validation section defines how we'll know if the decision was right
- [x] Review triggers define conditions for reconsidering the decision
- [x] Concern impact section is complete
- [ ] ADR is consistent with governing feature spec and PRD requirements: FEAT-004 and CONTRACT-004 need the view target added once this is accepted
