---
ddx:
  id: ADR-015
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: ADR-011
    - kind: informs
      to: FEAT-001
---

# ADR-015: Rename tokens to roles now, with aliases, before wider adoption

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-05 | Accepted | Operator | FEAT-001 (FR-5, THEME-10, THEME-11), ADR-011 (step 4) | High |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | Several public token names describe a colour, not a role. `--navy` is the structural colour (primary buttons, selection) and is near-white in dark themes; `--paper` is the ground. With brands (ADR-013), a brand's "navy" may be green. Names harden as more apps depend on them. |
| Current State | 178 tokens in `@ux-builder/tokens` 0.3.0, consumed by `@ux-builder/ui` and, next, by the platform and the billing-review app. ADR-011 planned the rename as step 4, before a first "real" release. |
| Requirements | FR-5: role names, current names kept as aliases for one major version. |
| Decision Drivers | Every new consumer raises the cost of renaming. The brand × design system split (ADR-013) touches every token anyway. |

## Decision

We will publish role-based names as the public contract in the same phase as
ADR-013 (PRD Phase 0), tiered as ADR-011 set out:

- **Primitives** — raw palette and scales; not for apps.
- **Roles** — for example `color.ground`, `color.surface`,
  `color.surface-sunken`, `color.text`, `color.text-muted`,
  `color.text-subtle`, `color.structure`, `color.accent`, `color.rule`,
  `state.live` … `state.closed`, plus type, space, radius and shadow roles.
- **Component** — `button.*`, `field.*`, `table.*`, and the other widget
  groups.

Every current name (`--navy`, `--paper`, `--ink`, …) is generated as an alias
of its role for one major version, and its removal is announced in the
changelog. The full name map is proposed as a reviewed table in a pull request
before any rename lands; this ADR decides the scheme and the timing, not each
name.

**Key Points**: Roles, not colours | Rename once, now | Aliases for one major
version | Name map reviewed before it lands

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| Keep current names | No migration | `--navy` that is white or green misleads every developer and agent; cost of change grows with adoption | Rejected |
| Rename later, after the brand builder | Ships features sooner | Every brand and app made in between uses the old names; the rename then touches more | Rejected: ADR-011 already ordered the rename first |
| Adopt MCP Apps' variable names as the contract | Zero mapping for MCP Apps hosts | Lacks state, accent and component roles; ties the contract to one protocol | Rejected (ADR-011): it is an output |
| **Role names now, aliases for one major (chosen)** | Clear contract before adoption; no breakage | One migration for current consumers; a period with two names | **Selected**: cheapest moment to rename is now |

## Consequences

| Type | Impact |
|------|--------|
| Positive | Token names mean the same in every brand and system; agents and developers pick tokens by purpose. |
| Negative | `@ux-builder/ui`, the gallery, generators and consumers migrate; two names coexist for a major version. |
| Neutral | The values do not change; only names. |

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| A missed alias breaks a consumer | Medium | High | Alias generation covers every 0.x name, checked by a test listing all old names |
| Bike-shedding delays Phase 0 | Medium | Medium | The name map is one reviewed table; unresolved names keep the current name as primary until decided |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| Every 0.x token name resolves via alias in 1.x | A consumer breaks on upgrade |
| `@ux-builder/ui` uses role names only | A widget still reads an alias at 1.0 |

## Supersession

- **Supersedes**: None. Carries out ADR-011's step 4 rename.
- **Superseded by**: None

## Concern Impact

- No concern impact.

## References

- ADR-011 — Decision, layer 1 (tiered names) and Risks (renaming pass)
- `README.md` — Status table, step 4
