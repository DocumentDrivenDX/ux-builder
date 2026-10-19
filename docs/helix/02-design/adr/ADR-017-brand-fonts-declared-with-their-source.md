---
ddx:
  id: ADR-017
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: ADR-013
    - kind: informs
      to: FEAT-001
    - kind: informs
      to: FEAT-003
    - kind: informs
      to: FEAT-004
---

# ADR-017: Brands may override fonts, and declare where each font comes from

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-05 | Accepted | Operator | FEAT-001 (FR-6, THEME-03), FEAT-003 (BB-11), FEAT-004 (SDK-02) | Medium |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | The operator decided a brand may optionally override a design system's fonts. Fonts must also ship from the SDK so apps stop loading them by hand. Many brand fonts are commercially licensed and cannot be redistributed freely. |
| Current State | Design systems name their fonts (Roboto, Segoe UI, IBM Plex); apps load them; the gallery and Storybook load Roboto and Plex from Google Fonts; Segoe UI is not served. |
| Requirements | FR-6, THEME-03, BB-11, SDK-02. |
| Decision Drivers | Licensing; privacy (third-party font hosts); offline and embedded views (an iframe does not inherit fonts, ADR-011). |

## Decision

We will let a brand override the display, body and mono fonts, each declared
with a **source**:

- `bundled` — open-licensed fonts (OFL, Apache) shipped inside an SDK package
  and loaded by the SDK. Design-system defaults that allow it (Roboto, IBM
  Plex) move here.
- `google` — loaded from Google Fonts by family name; allowed, but not the
  default for production apps.
- `client-hosted` — licensed fonts loaded from a URL the client controls; the
  SDK never copies the files.
- `system` — a system font that is not shipped (for example Segoe UI).

Every font declaration carries a fallback stack. A font with no recorded
source or licence is rejected by the build.

**Key Points**: Override is optional | Every font has a source and a fallback
| Licensed files are never copied into SDK packages

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| No brand fonts; design system fonts only | Simple; no licensing exposure | Contradicts the operator's decision | Rejected |
| Copy every brand font into a package | One loading path | Licence violations for commercial fonts | Rejected |
| **Declared source per font (chosen)** | Lawful for every font; one loading API; works offline for bundled fonts | Four loading paths to support | **Selected** |

## Consequences

| Type | Impact |
|------|--------|
| Positive | Apps stop loading fonts by hand; licensing is explicit in the brand file and visible in review. |
| Negative | The SDK supports several loading paths; client-hosted fonts depend on client availability. |
| Neutral | Type scale and metrics stay the design system's; a brand font may render slightly larger or smaller. |

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| A licensed font is bundled by mistake | Low | High | The build rejects `bundled` fonts whose licence is not on an allow-list (OFL, Apache-2.0) |
| A brand font's metrics break layouts | Medium | Low | Gallery and Storybook preview every brand; type scale unchanged |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| 0 font files with non-open licences in SDK packages | Any found in a release |
| 0 apps loading fonts outside the SDK | An app needs its own font loading |

## Supersession

- **Supersedes**: None
- **Superseded by**: None

## Concern Impact

- **`security-owasp`**: `google` and `client-hosted` sources are third-party
  requests; production apps should prefer `bundled` or `client-hosted`.

## References

- FEAT-001 THEME-03, FEAT-003 BB-11, FEAT-004 SDK-02
- ADR-011 — fonts passed explicitly to embedded views
